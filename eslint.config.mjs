/**
 * @type {import('eslint').Linter.Config[]}
 */
const eslintConfig = [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/prisma/migrations/**",
      "**/next-env.d.ts",
    ],
  },
];

export default eslintConfig;
