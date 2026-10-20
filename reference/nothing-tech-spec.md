# NOTHING — Техническое задание (v1)

## 1. Цель проекта

Сайт, на котором пользователь платит реальные деньги (крипта: BTC, ETH, SOL,
USDC, USDT) и не получает взамен никакого продукта, подписки или обещания
дохода. Единственное, что он получает — публичную запись в лидерборде и
NFT-«чек», подтверждающий факт оплаты.

Ключевое архитектурное правило проекта:

> Источник истины — блокчейн (или платёжный шлюз как доверенный посредник
> для блокчейнов, которые мы не верифицируем напрямую). Фронтенд никогда не
> сообщает серверу, сколько было заплачено — сервер сам это проверяет.

---

## 2. Общая архитектура

```
                         NOTHING
                            │
                       Payment UI
                            │
                 ┌──────────┴──────────┐
                 │                     │
             SOL / USDC            BTC / ETH / USDT
                 │                     │
          Solana Adapter         Gateway Adapter
                 │                     │
            Solana RPC        Coinbase Commerce /
                 │             NOWPayments / BitPay
                 │                     │
                 └──────────┬──────────┘
                             │
                      Payment Service
                     (единая модель Payment)
                             │
                  ┌──────────┴──────────┐
                  │                     │
              Supabase              NFT Worker
           (leaderboard,           (Solana mint,
          live counter, статусы)   universal receipt)
```

Оба платёжных пути (Solana-native и gateway) приводятся к одной и той же
модели `Payment` и дальше система не различает, откуда пришли деньги.

---

## 3. Стек технологий

| Задача              | Технология                                  |
|---------------------|----------------------------------------------|
| Frontend            | Next.js + TypeScript + React                 |
| UI                  | Tailwind CSS + Framer Motion                 |
| Wallet (Solana)     | Solana Wallet Adapter (Phantom, Solflare)    |
| Оплата Solana       | Solana Pay (QR/мобайл) + прямая транзакция   |
| Оплата BTC/ETH/USDT | Платёжный шлюз (Coinbase Commerce / NOWPayments / BitPay) |
| Blockchain (native) | Solana                                       |
| RPC                 | Helius / другой production RPC-провайдер     |
| База данных         | Supabase (PostgreSQL)                        |
| Realtime            | Supabase Realtime (Postgres Changes → позже Broadcast) |
| NFT                 | Metaplex Umi (минт только на Solana, универсально для всех валют оплаты) |
| Хранилище метаданных NFT | IPFS / Arweave                          |
| Генерация картинки чека | Satori / @vercel/og                      |
| Хостинг             | Vercel                                       |
| Rate limiting       | Upstash Redis                                |
| Мониторинг ошибок   | Sentry                                       |
| CDN / DDoS          | Cloudflare                                   |
| Секреты             | Vercel / Supabase secrets                    |

---

## 4. Платёжные потоки

### 4.1 Solana (native) — SOL / USDC-SPL

```
FRONTEND → создать payment intent → BACKEND → Supabase (payment создан)
FRONTEND → построить транзакцию → USER WALLET → подписать → SOLANA
SOLANA → signature → FRONTEND → отправить signature → BACKEND
BACKEND → проверить транзакцию через Solana RPC:
    ✓ transaction существует и finalized
    ✓ recipient = TREASURY_WALLET
    ✓ token = SOL или USDC
    ✓ amount >= expected amount
    ✓ reference совпадает с payment intent
    ✓ signature ещё не использовалась
BACKEND → payment.status = verified → Supabase → Leaderboard → Realtime update
```

Каждый payment intent получает уникальный `reference` (публичный ключ),
который вшивается в транзакцию — это единственный надёжный способ понять,
к какому именно intent относится пришедшая транзакция.

### 4.2 BTC / ETH / USDT — через платёжный шлюз

Фронтенд не занимается верификацией блокчейна вообще — этим занимается
шлюз.

```
FRONTEND → createPayment({ amount: 420, currency: "BTC" })
BACKEND → шлюз создаёт платёж → возвращает { address / invoice, qr, expiresAt }
FRONTEND → показывает адрес/QR пользователю
Пользователь → платит из любого кошелька
Шлюз → отслеживает блокчейн самостоятельно
Шлюз → присылает webhook backend'у, когда платёж подтверждён
BACKEND → обрабатывает webhook (см. 4.3) → payment.status = verified
```

Важно: BTC и ETH-платежи не получают отдельной кастомной верификации через
собственный RPC — за это отвечает шлюз. Backend доверяет шлюзу, но не
доверяет произвольному HTTP-запросу на свой webhook-эндпоинт (см. ниже).

### 4.3 Проверка webhook от шлюза — обязательные шаги

```
Webhook получен
   ↓
1. Проверить подпись/секрет webhook (HMAC от провайдера)
   ↓
2. Найти payment по paymentId/invoiceId из тела запроса
   ↓
3. Проверить, что payment ещё не в статусе verified (идемпотентность)
   ↓
4. Проверить currency и amount совпадают с ожидаемыми в payment intent
   ↓
5. Проверить статус платежа именно как "confirmed"/"completed" у провайдера
   (а не "pending" или "underpaid")
   ↓
Только после всех проверок → payment.status = verified
```

Ни один webhook не должен напрямую переводить платёж в `verified` без этой
цепочки проверок — иначе любой, кто узнает URL эндпоинта, сможет
инсценировать оплату.

---

## 5. Модель данных

### 5.1 Таблица `payments` (единая для всех валют/сетей)

| Поле                | Тип           | Описание                                    |
|---------------------|---------------|----------------------------------------------|
| id                  | uuid          | первичный ключ                               |
| sequence_number     | bigint        | номер чека (#00421)                          |
| chain               | text          | `solana` / `bitcoin` / `ethereum`            |
| currency            | text          | `SOL` / `USDC` / `BTC` / `ETH` / `USDT`      |
| provider            | text          | `native` / `coinbase` / `nowpayments` и т.п. |
| payer_address       | text          | адрес плательщика (если известен)            |
| amount_crypto       | numeric       | сумма в исходной валюте                      |
| amount_usd          | numeric       | сумма в USD на момент платежа                |
| usd_rate            | numeric       | курс, по которому зафиксирован amount_usd    |
| price_timestamp     | timestamptz   | момент фиксации курса                        |
| reference           | text, nullable| уникальный reference (только для Solana)     |
| transaction_signature | text, nullable | tx hash / signature (для native-платежей) |
| provider_payment_id | text, nullable| ID платежа на стороне шлюза                  |
| status              | text          | см. state machine ниже                       |
| created_at          | timestamptz   |                                                |
| confirmed_at        | timestamptz   |                                                |
| mint_id             | uuid, nullable| ссылка на nft_mints                          |

**Уникальные ограничения (обязательны):**

```sql
CREATE UNIQUE INDEX payments_signature_unique
  ON payments(transaction_signature)
  WHERE transaction_signature IS NOT NULL;

CREATE UNIQUE INDEX payments_reference_unique
  ON payments(reference)
  WHERE reference IS NOT NULL;

CREATE UNIQUE INDEX payments_provider_payment_unique
  ON payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;
```

Важно фиксировать `amount_usd` и `usd_rate` в момент платежа — курс SOL/BTC/ETH
меняется, и пересчитывать исторические платежи по текущему курсу нельзя
(иначе вчерашние $100 завтра станут $180 в лидерборде).

### 5.2 State machine статуса платежа

```
created → pending → submitted → confirmed → verified → minted
                                     │
                                     └──→ failed / expired
```

Leaderboard и live-счётчик считают **только** платежи в статусе `verified`
(или позже). Неподтверждённые платежи никогда не отображаются публично.

### 5.3 Таблица `nft_mints`

| Поле                | Тип     |
|---------------------|---------|
| id                  | uuid    |
| payment_id          | uuid    |
| mint_address        | text    |
| collection_address  | text    |
| metadata_uri        | text    |
| minted_at           | timestamptz |
| status              | text    |

### 5.4 Таблица `app_config`

`treasury_address`, `usdc_mint`, `network`, `minimum_payment`,
`gateway_provider_keys` (ссылки на секреты, не сами ключи).

---

## 6. API-эндпоинты

| Метод | Путь                            | Назначение                                  |
|-------|----------------------------------|----------------------------------------------|
| POST  | `/api/payments/create`          | создать payment intent (любая валюта)        |
| POST  | `/api/payments/verify`          | верификация Solana-платежа (signature)       |
| POST  | `/api/webhooks/gateway`         | приём webhook от платёжного шлюза            |
| GET   | `/api/leaderboard`              | топ плательщиков (агрегация по `payments`)   |
| GET   | `/api/receipts/:id/image`       | сгенерировать OG-картинку чека               |
| POST  | `/api/jobs/mint`                | воркер/крон для минта NFT по verified-платежам |

---

## 7. NFT — универсальный чек

NFT чеканится **только на Solana**, независимо от того, в какой сети
реально пришли деньги. Он не удостоверяет сеть платежа — он удостоверяет
сам факт: «Receipt #421 — payment verified», а детали сети уходят в
metadata.

```json
{
  "name": "Nothing Receipt #00421",
  "description": "Proof that someone voluntarily paid for nothing.",
  "image": "https://.../api/receipts/421/image",
  "attributes": [
    { "trait_type": "Payment Network", "value": "Bitcoin" },
    { "trait_type": "Currency", "value": "BTC" },
    { "trait_type": "Amount", "value": "0.0124 BTC" },
    { "trait_type": "USD Value", "value": "$1000" },
    { "trait_type": "Receipt", "value": "421" }
  ]
}
```

Минт вынесен в отдельный воркер (не в HTTP-запрос верификации), чтобы
сбой или задержка минта не блокировали подтверждение платежа:

```
payment verified → создать mint job → очередь → NFT worker → Metaplex → mint address → сохранить
```

На старте достаточно cron-эндпоинта, который выбирает `verified`-платежи
без `mint_id` и обрабатывает их пачками; очередь (Upstash Redis + BullMQ)
подключается позже, при росте трафика.

---

## 8. Frontend / UX

Валюта выбирается в едином интерфейсе, без привязки к конкретной сумме:

```
HOW DO YOU WANT TO WASTE YOUR MONEY?

[ SOL ]   [ USDC ]   [ BTC ]   [ ETH ]   [ USDT ]
```

Выбор валюты меняет платёжный поток «под капотом» (native или gateway), но
пользователь этого не замечает — итоговый экран всегда одинаковый:

```
PAYMENT VERIFIED.

You now own exactly what you owned before.

Receipt #00421 has been minted.
```

Основные экраны: hero с live-счётчиком, выбор тира/суммы, модалка оплаты,
страница чека (`/receipt/[id]`) с кнопкой шеринга в X и ссылкой на
блокчейн-эксплорер, страница лидерборда.

---

## 9. Безопасность — обязательные правила

- Никогда не доверять данным от клиента: сумма, валюта, статус платежа —
  всё проверяется на сервере через блокчейн или шлюз, а не через то, что
  прислал браузер.
- Уникальные constraints на `transaction_signature`, `reference` и
  `(provider, provider_payment_id)` — исключают повторное использование
  одной и той же транзакции/webhook для нескольких «чеков».
- Rate limiting на `/api/payments/create` и `/api/payments/verify`
  (например, 10 запросов/минуту на IP, 5 payment intent/минуту на кошелёк)
  — ограничивает API, а не саму отправку транзакции в блокчейн.
- Treasury-адрес — публичный ключ на сервере, приватный ключ — офлайн/
  hardware wallet. Для приёма денег приватный ключ не нужен вообще.
- Кошелёк для минта NFT — отдельный от treasury. Утечка одного не должна
  давать доступ к другому.
- RPC — не полагаться на один бесплатный публичный узел; использовать
  production-провайдера (Helius и т.п.) с возможностью замены.
- Webhook от платёжного шлюза — обязательная проверка подписи/секрета и
  идемпотентности (см. 4.3), никогда не доверять запросу «как есть».

---

## 10. Переменные окружения

```
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta
NEXT_PUBLIC_TREASURY_ADDRESS=...
NEXT_PUBLIC_USDC_MINT=...
SOLANA_RPC_URL=...

GATEWAY_PROVIDER=coinbase|nowpayments|bitpay
GATEWAY_API_KEY=...
GATEWAY_WEBHOOK_SECRET=...

SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=...

NFT_AUTHORITY_PRIVATE_KEY=...
STORAGE_API_KEY=...
```

`NFT_AUTHORITY_PRIVATE_KEY`, `SUPABASE_SECRET_KEY` и `GATEWAY_API_KEY`
никогда не должны попадать в `NEXT_PUBLIC_*` и не должны коммититься в Git.

---

## 11. Структура проекта

```
nothing/
├── app/
│   ├── page.tsx
│   ├── pay/page.tsx
│   ├── receipt/[id]/page.tsx
│   ├── leaderboard/page.tsx
│   └── api/
│       ├── payments/create/route.ts
│       ├── payments/verify/route.ts
│       ├── webhooks/gateway/route.ts
│       ├── leaderboard/route.ts
│       ├── receipts/[id]/image/route.ts
│       └── jobs/mint/route.ts
├── components/
│   ├── Hero.tsx
│   ├── CurrencyPicker.tsx
│   ├── PaymentModal.tsx
│   ├── Leaderboard.tsx
│   ├── LiveCounter.tsx
│   ├── ReceiptCard.tsx
│   └── TransactionStatus.tsx
├── lib/
│   ├── solana/ (connection, constants, payments, verify, tokens)
│   ├── gateway/ (client, webhook-verify, mapping)
│   ├── supabase/ (client, server)
│   ├── nft/ (mint, metadata, storage)
│   ├── receipt/ (generate, template)
│   └── pricing/ (usdRate.ts)
├── hooks/ (usePayment, useLeaderboard, useRealtime)
├── types/ (payment, nft, leaderboard)
├── supabase/migrations/
└── .env.local
```

---

## 12. План разработки

### MVP (без NFT)
- Landing + выбор тира/суммы
- Solana: wallet connect + оплата SOL/USDC + backend-верификация через RPC
- BTC/ETH/USDT: интеграция с платёжным шлюзом + webhook-обработка
- Единая таблица `payments`, live-счётчик, лидерборд (Supabase Realtime)
- Rate limiting, базовый error handling

*Критерий готовности:* человек может зайти → выбрать любую из 5 валют →
заплатить → получить подтверждение → попасть в лидерборд.

### V2 — NFT
- Очередь/воркер минта на Solana для любого verified-платежа
- Universal receipt metadata (сеть/валюта фиксируются в attributes)
- Страница чека с ссылкой на NFT

### V3 — виральность
- OG-картинка чека (Satori/@vercel/og), шеринг в X
- Достижения по тирам (Mistake / Nice / Degen / Whale / Why) — чисто
  визуальная классификация, без финансовой utility
- Live transaction ticker, NFT-галерея, «Biggest Nothing Holder»

---

## 13. Чек-лист перед запуском (devnet → mainnet)

- [ ] Solana: протестировано на devnet (Phantom, Solflare, SOL, USDC)
- [ ] Gateway: протестирован в sandbox-режиме провайдера
- [ ] Дубликаты signature/reference/webhook отклоняются
- [ ] Неверная сумма/валюта/получатель отклоняются
- [ ] Неподтверждённые транзакции не попадают в счётчик и лидерборд
- [ ] Treasury-адрес и приватный ключ NFT-минтера — раздельные кошельки
- [ ] Секреты не в Git, rate limiting включён
- [ ] Sentry и бэкапы БД включены
- [ ] Мобильные кошельки протестированы
- [ ] Новый Supabase-проект, новый treasury, новый RPC — под mainnet
      (не переиспользовать devnet-секреты)

---

## 14. Мониторинг

Sentry — ошибки; Vercel Analytics — трафик сайта; собственные метрики:
`payments_created`, `payments_verified`, `payments_failed`,
`nfts_minted`, `nfts_failed`, `gateway_webhook_errors`, `rpc_errors`.
Отдельная таблица `payment_events` (created → submitted → verified →
nft_queued → minted / failed) сильно упрощает отладку проблемных платежей.
