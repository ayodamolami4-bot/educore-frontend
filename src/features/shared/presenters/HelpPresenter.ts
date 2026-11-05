import { Store } from '../../../core/Store';
import type { SharedModel } from '../models/SharedModel';
import type { AccessHelp } from '../../../api/contracts';
import { errorMessage } from '../../../api/errors';
export class HelpPresenter extends Store<{
  loading: boolean;
  error: string;
  help: AccessHelp | null;
}> {
  constructor(private model: SharedModel) {
    super({ loading: true, error: '', help: null });
  }
  async load(schoolCode?: string): Promise<void> {
    this.patch({ loading: true, error: '' });
    try {
      this.patch({ help: await this.model.help(schoolCode) });
    } catch (error) {
      this.patch({ error: errorMessage(error) });
    } finally {
      this.patch({ loading: false });
    }
  }
}
