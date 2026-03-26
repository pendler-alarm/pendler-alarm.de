import { globalIgnores } from 'eslint/config';
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript';
import pluginVue from 'eslint-plugin-vue';
import pluginVitest from '@vitest/eslint-plugin';
import pluginOxlint from 'eslint-plugin-oxlint';
import skipFormatting from 'eslint-config-prettier/flat';

const hasLetters = (value: string): boolean => /[A-Za-zÄÖÜäöüß]/.test(value);
const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();
const isPathLike = (value: string): boolean => /^[A-Za-z0-9_./:-]+$/.test(value);
const isTranslationCall = (parent: { type?: string; callee?: { type?: string; name?: string; property?: { name?: string } } } | undefined): boolean => {
  if (parent?.type !== 'CallExpression') {
    return false;
  }

  if (parent.callee?.type === 'Identifier') {
    return ['t', '$t', 'translate'].includes(parent.callee.name ?? '');
  }

  return parent.callee?.type === 'MemberExpression' && parent.callee.property?.name === 't';
};
const isSuspiciousTemplateText = (value: string): boolean => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || !hasLetters(normalizedValue)) {
    return false;
  }

  if (normalizedValue.includes('{{') || normalizedValue.includes('}}')) {
    return false;
  }

  return true;
};
const isSuspiciousScriptText = (value: string): boolean => {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue || !hasLetters(normalizedValue)) {
    return false;
  }

  if (normalizedValue.includes('http://') || normalizedValue.includes('https://')) {
    return false;
  }

  if (normalizedValue.includes('@/') || normalizedValue.includes('../') || normalizedValue.includes('./')) {
    return false;
  }

  if (normalizedValue.includes('${')) {
    return false;
  }

  if (normalizedValue === '?raw') {
    return false;
  }

  if (isPathLike(normalizedValue)) {
    return false;
  }

  return /\s|[.!?:`]/.test(normalizedValue);
};

const i18nPlugin = {
  meta: {
    name: 'local-i18n',
  },
  rules: {
    'no-hardcoded-text': {
      meta: {
        type: 'problem',
        docs: {
          description: 'Disallow hardcoded UI text outside i18n message files.',
        },
        schema: [],
        messages: {
          hardcodedText: '🌐 Text direkt im Code gefunden. Bitte ueber i18n auslagern.',
        },
      },
      create(context: {
        filename: string;
        report: (descriptor: { node: unknown; messageId: 'hardcodedText' }) => void;
        sourceCode?: {
          parserServices?: {
            defineTemplateBodyVisitor?: (
              templateBodyVisitor: Record<string, (node: { value?: string }) => void>,
              scriptVisitor?: Record<string, never>,
            ) => Record<string, (node: { value?: string }) => void>;
          };
        };
      }) {
        const filename = context.filename.replace(/\\/g, '/');
        const shouldIgnoreFile = [
          '/src/i18n/messages/',
          '/src/router/',
          '/src/components/__tests__/',
        ].some((segment) => filename.includes(segment)) || filename.endsWith('.spec.ts');

        if (shouldIgnoreFile) {
          return {};
        }

        const templateBodyVisitor = {
          VText(node: { value?: string }) {
            const value = node.value ?? '';

            if (!isSuspiciousTemplateText(value)) {
              return;
            }

            context.report({ node, messageId: 'hardcodedText' });
          },
        };

        const scriptVisitor = {
          Literal(node: {
            parent?: { type?: string; callee?: { type?: string; name?: string; property?: { name?: string } } };
            value?: unknown;
          }) {
            if (typeof node.value !== 'string') {
              return;
            }

            if (
              node.parent?.type === 'ImportDeclaration'
              || node.parent?.type === 'ExportAllDeclaration'
              || node.parent?.type === 'ExportNamedDeclaration'
              || isTranslationCall(node.parent)
            ) {
              return;
            }

            if (!isSuspiciousScriptText(node.value)) {
              return;
            }

            context.report({ node, messageId: 'hardcodedText' });
          },
          TemplateLiteral(node: {
            parent?: { type?: string; callee?: { type?: string; name?: string; property?: { name?: string } } };
            expressions?: unknown[];
            quasis?: Array<{ value?: { cooked?: string | null } }>;
          }) {
            if ((node.expressions?.length ?? 0) > 0 || isTranslationCall(node.parent)) {
              return;
            }

            const literalValue = node.quasis?.[0]?.value?.cooked ?? '';

            if (!isSuspiciousScriptText(literalValue)) {
              return;
            }

            context.report({ node, messageId: 'hardcodedText' });
          },
        };

        return context.sourceCode?.parserServices?.defineTemplateBodyVisitor
          ? context.sourceCode.parserServices.defineTemplateBodyVisitor(templateBodyVisitor, scriptVisitor)
          : scriptVisitor;
      },
    },
  },
};

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{vue,ts,mts,tsx}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  ...pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,

  {
    ...pluginVitest.configs.recommended,
    files: ['src/**/__tests__/*'],
  },

  ...pluginOxlint.buildFromOxlintConfigFile('.oxlintrc.json'),

  skipFormatting,

  {
    name: 'app/i18n-rules',
    files: ['src/**/*.{vue,ts,mts,tsx}'],
    plugins: {
      'local-i18n': i18nPlugin,
    },
    rules: {
      'local-i18n/no-hardcoded-text': 'error',
    },
  },

  {
    name: 'app/semicolon-rules',
    files: ['**/*.{vue,ts,mts,tsx}'],
    rules: {
      semi: ['error', 'always'],
    },
  },
);
