import { Command, Argument, Option } from 'commander';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { generate } from './generator.js';
import {
  RuleDocTitleFormat,
  RULE_DOC_TITLE_FORMAT_DEFAULT,
  RULE_DOC_TITLE_FORMATS,
} from './rule-doc-title-format.js';
import { COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING } from './rule-list-columns.js';
import { NOTICE_TYPE_DEFAULT_PRESENCE_AND_ORDERING } from './rule-notices.js';
import { COLUMN_TYPE, NOTICE_TYPE } from './types.js';
import type { PackageJson } from 'type-fest';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getCurrentPackageVersion(): string {
  const packageJson: PackageJson = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf8') // Relative to compiled version of this file in the dist folder.
  );
  if (!packageJson.version) {
    throw new Error('Could not find package.json `version`.');
  }
  return packageJson.version;
}

// Used for collecting repeated CLI options into an array.
function collect(value: string, previous: string[]) {
  return [...previous, value];
}

export function run() {
  const program = new Command();

  program
    .version(getCurrentPackageVersion())
    .addArgument(
      new Argument('[path]', 'path to ESLint plugin root').default('.')
    )
    .option(
      '--check',
      '(optional) Whether to check for and fail if there is a diff. No output will be written. Typically used during CI.',
      false
    )
    .option(
      '--config-emoji <config-emoji>',
      '(optional) Custom emoji to use for a config. Defaults to `recommended,✅`. Configs for which no emoji is specified will expect a corresponding badge to be specified in `README.md` instead. Option can be repeated.',
      collect,
      []
    )
    .option(
      '--ignore-config <config>',
      '(optional) Config to ignore from being displayed (often used for an `all` config) (option can be repeated).',
      collect,
      []
    )
    .option(
      '--ignore-deprecated-rules',
      '(optional) Whether to ignore deprecated rules from being checked, displayed, or updated.',
      false
    )
    .option(
      '--rule-doc-notices <notices>',
      `(optional) Ordered, comma-separated list of notices to display in rule doc. Non-applicable notices will be hidden. (choices: "${Object.values(
        NOTICE_TYPE
      ).join('", "')}")`,
      // List of default enabled notices.
      Object.entries(NOTICE_TYPE_DEFAULT_PRESENCE_AND_ORDERING)
        .filter(([_col, enabled]) => enabled)
        .map(([col]) => col)
        .join(',')
    )
    .option(
      '--rule-doc-section-exclude <section>',
      '(optional) Disallowed section in each rule doc (option can be repeated).',
      collect,
      []
    )
    .option(
      '--rule-doc-section-include <section>',
      '(optional) Required section in each rule doc (option can be repeated).',
      collect,
      []
    )
    .option(
      '--rule-doc-section-options [required]',
      '(optional) Whether to require an "Options" or "Config" rule doc section and mention of any named options for rules with options.',
      true
    )
    .addOption(
      new Option(
        '--rule-doc-title-format <format>',
        '(optional) The format to use for rule doc titles.'
      )
        .choices(RULE_DOC_TITLE_FORMATS)
        .default(RULE_DOC_TITLE_FORMAT_DEFAULT)
    )
    .option(
      '--rule-list-columns <columns>',
      `(optional) Ordered, comma-separated list of columns to display in rule list. Empty columns will be hidden. (choices: "${Object.values(
        COLUMN_TYPE
      ).join('", "')}")`,
      // List of default enabled columns.
      Object.entries(COLUMN_TYPE_DEFAULT_PRESENCE_AND_ORDERING)
        .filter(([_col, enabled]) => enabled)
        .map(([col]) => col)
        .join(',')
    )
    .option(
      '--split-by <property>',
      '(optional) Rule property to split the rules list by. A separate list and header will be created for each value. Example: `meta.type`.'
    )
    .option(
      '--url-configs <url>',
      '(optional) Link to documentation about the ESLint configurations exported by the plugin.'
    )
    .action(async function (
      path,
      options: {
        check?: boolean;
        configEmoji?: string[];
        ignoreConfig: string[];
        ignoreDeprecatedRules?: boolean;
        ruleDocNotices: string;
        ruleDocSectionExclude: string[];
        ruleDocSectionInclude: string[];
        ruleDocSectionOptions?: boolean;
        ruleDocTitleFormat: RuleDocTitleFormat;
        ruleListColumns: string;
        urlConfigs?: string;
        splitBy?: string;
      }
    ) {
      await generate(path, {
        check: options.check,
        configEmoji: options.configEmoji,
        ignoreConfig: options.ignoreConfig,
        ignoreDeprecatedRules: options.ignoreDeprecatedRules,
        ruleDocNotices: options.ruleDocNotices,
        ruleDocSectionExclude: options.ruleDocSectionExclude,
        ruleDocSectionInclude: options.ruleDocSectionInclude,
        ruleDocSectionOptions: ['true', true, undefined].includes(
          options.ruleDocSectionOptions
        ),
        ruleDocTitleFormat: options.ruleDocTitleFormat,
        ruleListColumns: options.ruleListColumns,
        urlConfigs: options.urlConfigs,
        splitBy: options.splitBy,
      });
    })
    .parse(process.argv);

  return program;
}
