import { BaseBuildTool } from './build-system.js'

export class Buck extends BaseBuildTool {
  id = 'buck'
  name = 'Buck'
  configFiles = ['.buckconfig', 'BUCK']

  async detect() {
    const config = await this.project.fs.findUp(this.configFiles, {
      cwd: this.project.baseDirectory,
      stopAt: this.project.root,
    })

    if (config) {
      return this
    }
  }
}
