import { getAvailableIntegrations } from './api/integrations.js'
import { IntegrationResponse } from './types/api.js'
import { Integration } from './types/integrations.js'
import { TestOptions } from './types/options.js'

type MergeIntegrationsOpts = {
  // Integrations that have been configured in the TOML file
  configIntegrations?: { name: string; dev?: { path: string; force_run_in_build?: boolean } }[]
  // Integrations that have been enabled on the site
  apiIntegrations: IntegrationResponse[]
  context: string
  testOpts?: TestOptions
  offline: boolean
}

export const mergeIntegrations = async function ({
  configIntegrations = [],
  apiIntegrations,
  context,
  testOpts = {},
  offline,
}: MergeIntegrationsOpts): Promise<Integration[]> {
  // All integrations that are available to the site
  const availableIntegrations = await getAvailableIntegrations({ testOpts, offline })

  // Include all API integrations, unless they have a `dev` property and we are in the `dev` context
  const resolvedApiIntegrations = apiIntegrations.filter(
    (integration) =>
      !configIntegrations.some(
        (configIntegration) =>
          configIntegration.name === integration.slug &&
          typeof configIntegration.dev !== 'undefined' &&
          context === 'dev',
      ),
  )

  // For integrations loaded from the TOML, we will use the local reference in the `dev` context,
  // otherwise we will fetch from the API and match the slug
  const resolvedConfigIntegrations = configIntegrations
    .filter(
      (configIntegration) =>
        // TODO - this every statement will exlude config integrations if they also exist in the apiIntegrations
        apiIntegrations.every((apiIntegration) => apiIntegration.slug !== configIntegration.name) ||
        ('dev' in configIntegration && context === 'dev'),
    )
    .map((configIntegration) => {
      if (configIntegration.dev && context === 'dev') {
        const integrationInstance = apiIntegrations.find(
          (apiIntegration) => apiIntegration.slug === configIntegration.name,
        )

        const availableIntegration = availableIntegrations.find(
          (availableIntegration) => availableIntegration.slug === configIntegration.name,
        )

        return {
          ...configIntegration,
          slug: configIntegration.name,
          version: configIntegration.dev.path ? undefined : availableIntegration?.hostSiteUrl,
          has_build: integrationInstance?.has_build ?? configIntegration.dev?.force_run_in_build ?? false,
        }
      }

      const integration = availableIntegrations.find(
        (availableIntegration) => availableIntegration.slug === configIntegration.name,
      )
      if (!integration) {
        return undefined
      }

      return {
        slug: integration.slug,
        version: integration.hostSiteUrl,
        has_build: !!integration.hasBuild,
      }
    })
    .filter((i): i is IntegrationResponse => typeof i !== 'undefined')

  return [...resolvedApiIntegrations, ...resolvedConfigIntegrations]
}
