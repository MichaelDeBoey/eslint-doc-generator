import { mockPlugin } from './mock-plugin.js';
import { getResolvedOptions } from './options.js';
import type { ResolvedGenerateOptions } from './options.js';
import { getPluginName, loadPlugin } from './package-json.js';
import type { ConfigsToRules, GenerateOptions, Plugin } from './types.js';
import { getPluginPrefix } from './plugin-prefix.js';
import { resolveConfigsToRules } from './plugin-config-resolution.js';

/**
 * Context about the current invocation of the program.
 *
 * Note: all markdown content is processed using LF (`\n`) line endings
 * internally. The desired end of line for each file is only applied when
 * writing the file in the generator.
 */
export interface Context {
  configsToRules: ConfigsToRules;
  options: ResolvedGenerateOptions;
  path: string;
  plugin: Plugin;
  pluginPrefix: string;
}

export async function getContext(
  path: string,
  userOptions?: GenerateOptions,
  useMockPlugin = false,
): Promise<Context> {
  const plugin = useMockPlugin ? mockPlugin : await loadPlugin(path);
  const pluginPrefix = getPluginPrefix(
    plugin.meta?.name ?? (await getPluginName(path)),
  );

  const configsToRules = await resolveConfigsToRules(plugin);
  const options = getResolvedOptions(plugin, userOptions);

  return {
    configsToRules,
    options,
    path,
    plugin,
    pluginPrefix,
  };
}
