export type ThemeType = 'light' | 'dark';

class ThemeSettings {
  theme: string;
  backgroundColor: string;
  gridlinesColor: string;
  connectorStrokeColor: string;
  nodeFillColor: string;
  nodeStrokeColor: string;

  constructor(theme: ThemeType) {
    this.theme = theme;

    if (theme === 'dark') {
      this.backgroundColor = '#1e1e1e';
      this.gridlinesColor = 'rgb(45, 45, 45)';
      this.connectorStrokeColor = 'rgb(66, 66, 66)';
      this.nodeFillColor = 'rgb(41, 41, 41)';
      this.nodeStrokeColor = 'rgb(66, 66, 66)';
    } else {
      this.backgroundColor = '#F8F9FA';
      this.gridlinesColor = '#EBE8E8';
      this.connectorStrokeColor = 'rgb(188, 190, 192)';
      this.nodeFillColor = 'rgb(255, 255, 255)';
      this.nodeStrokeColor = 'rgb(188, 190, 192)';
    }
  }
}

class ThemeService {
  private currentTheme: ThemeType = 'light';
  private currentThemeSettings: ThemeSettings;

  constructor() {
    this.currentThemeSettings = new ThemeSettings(this.currentTheme);
  }

  setTheme(theme: ThemeType): void {
    this.currentTheme = theme;
    this.currentThemeSettings = new ThemeSettings(theme);
  }

  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  getCurrentThemeSettings(): ThemeSettings {
    return this.currentThemeSettings;
  }
}

const themeService = new ThemeService();
export default themeService;
