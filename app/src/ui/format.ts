export const fmt = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
export const fmt0 = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 0 });
export const pct = (n: number) => `${fmt.format(n)} %`;
export const twh = (n: number) => `${fmt.format(n)} TWh`;
export const twh0 = (n: number) => `${fmt0.format(n)} TWh`;
export const gw = (n: number) => `${fmt.format(n)} GW`;
