export type Tool = 'select' | 'rect' | 'rrect' | 'polygon' | 'point';

export interface CoreVersion {
  version: string;
}

export const CORE_VERSION: CoreVersion = {
  version: '0.1.0'
};
