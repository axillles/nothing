import { FlatCompat } from '@eslint/eslintrc'

// eslint-config-next 15 ships legacy (eslintrc) configs, so wrap them for flat config.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname })

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'reference/**', 'next-env.d.ts'] },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
]

export default config
