// Ported from photo() in reference/prototype.html. data.test.ts checks the output is identical.
const WALLS: [string, string][] = [
  ['#F3E3C8', '#C9A877'],
  ['#E4ECF4', '#9FB3C8'],
  ['#F1DCD2', '#C79A86'],
  ['#E3EEDD', '#9DB88E'],
  ['#EFE7D6', '#B9A57C'],
  ['#E8E3F0', '#A99BC2'],
];

export function photo(seed: string, idx: number): string {
  const n = [...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0);
  const [wall, trim] = WALLS[n % WALLS.length] as [string, string];
  const scene = idx % 4;
  let body = '';
  if (scene === 0) {
    const floors = 1 + (n % 2),
      cols = 3 + (n % 3);
    const bw = 60 + cols * 52,
      bx = 200 - bw / 2,
      bh = 70 + floors * 58,
      by = 214 - bh;
    let win = '';
    for (let f = 0; f < floors; f++)
      for (let c = 0; c < cols; c++) {
        const wx = bx + 30 + c * 52,
          wy = by + 26 + f * 58;
        win += `<rect x="${wx}" y="${wy}" width="30" height="32" rx="2" fill="#5B7A99"/><rect x="${wx}" y="${wy}" width="30" height="32" rx="2" fill="none" stroke="#fff" stroke-width="3"/><path d="M${wx + 15} ${wy}v32" stroke="#fff" stroke-width="2"/>`;
      }
    body = `<rect width="400" height="260" fill="#BFD8EE"/><circle cx="${60 + (n % 5) * 60}" cy="44" r="18" fill="#FFF3C4"/>
    <path d="M0 196 C80 170 140 186 200 176 S330 166 400 182 V260 H0Z" fill="#8FB07A"/>
    <rect x="0" y="214" width="400" height="46" fill="#B9A58A"/>
    <path d="M${bx - 14} ${by + 4} L200 ${by - 30} L${bx + bw + 14} ${by + 4}Z" fill="#7A8794"/>
    <path d="M${bx - 14} ${by + 4} L200 ${by - 30} L${bx + bw + 14} ${by + 4}" fill="none" stroke="#5E6A75" stroke-width="3"/>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${wall}"/><rect x="${bx}" y="${by + bh - 16}" width="${bw}" height="16" fill="${trim}"/>
    ${win}<rect x="${bx + bw - 54}" y="${by + bh - 60}" width="28" height="60" fill="#6B4F3A"/>
    <circle cx="44" cy="170" r="30" fill="#5E8F4E"/><rect x="40" y="186" width="8" height="30" fill="#6B4F3A"/>
    <rect x="${bx - 40}" y="196" width="22" height="20" fill="#8C8C8C" opacity=".6"/>`;
  } else if (scene === 1) {
    body = `<rect width="400" height="260" fill="${wall}"/><rect y="190" width="400" height="70" fill="#C8B39A"/>
    <path d="M0 190h400" stroke="#A8927A" stroke-width="3"/>
    <rect x="236" y="40" width="110" height="88" rx="4" fill="#CFE3F3" stroke="#fff" stroke-width="6"/><path d="M291 40v88M236 84h110" stroke="#fff" stroke-width="4"/>
    <rect x="232" y="34" width="12" height="104" fill="${trim}" opacity=".8"/><rect x="338" y="34" width="12" height="104" fill="${trim}" opacity=".8"/>
    <rect x="34" y="130" width="170" height="70" rx="6" fill="#F7F7F5"/><rect x="34" y="150" width="170" height="50" rx="6" fill="#7E9CC0"/>
    <rect x="40" y="132" width="50" height="22" rx="8" fill="#fff"/><rect x="26" y="104" width="12" height="100" rx="3" fill="#7A5C44"/>
    <rect x="246" y="150" width="96" height="10" rx="2" fill="#8A6A50"/><rect x="252" y="160" width="8" height="40" fill="#8A6A50"/><rect x="328" y="160" width="8" height="40" fill="#8A6A50"/>
    <rect x="270" y="130" width="40" height="20" rx="2" fill="#3F4A57"/>`;
  } else if (scene === 2) {
    let tiles = '';
    for (let x = 0; x < 400; x += 32)
      for (let y = 0; y < 170; y += 32)
        tiles += `<rect x="${x + 1}" y="${y + 1}" width="30" height="30" fill="#EEF2F5"/>`;
    body = `<rect width="400" height="260" fill="#D5DDE3"/>${tiles}<rect y="170" width="400" height="90" fill="#9AA6B0"/>
    <rect x="70" y="40" width="80" height="70" rx="6" fill="#CFE3F3" stroke="#B7C3CC" stroke-width="4"/>
    <rect x="60" y="120" width="100" height="18" rx="6" fill="#fff" stroke="#B7C3CC" stroke-width="3"/><rect x="100" y="138" width="20" height="60" fill="#fff" stroke="#B7C3CC" stroke-width="3"/>
    <rect x="230" y="60" width="120" height="140" rx="4" fill="${wall}" stroke="${trim}" stroke-width="4"/><circle cx="335" cy="132" r="5" fill="${trim}"/>
    <path d="M100 112v-8" stroke="#8C99A3" stroke-width="5" stroke-linecap="round"/>`;
  } else {
    body = `<rect width="400" height="260" fill="#C4DCEF"/><rect y="170" width="400" height="90" fill="#A99577"/>
    <rect x="60" y="70" width="280" height="110" fill="${wall}"/><path d="M50 74 200 30 350 74Z" fill="#8C6E5A"/>
    <rect x="0" y="150" width="400" height="44" fill="#D9CDB8"/><rect x="0" y="150" width="400" height="8" fill="#BBAA8E"/>
    <rect x="150" y="146" width="100" height="70" fill="#4B5A69"/><path d="M150 160h100M150 176h100M150 192h100M150 208h100" stroke="#6B7C8D" stroke-width="3"/>
    <rect x="96" y="96" width="36" height="34" fill="#5B7A99"/><rect x="268" y="96" width="36" height="34" fill="#5B7A99"/>
    <circle cx="350" cy="140" r="26" fill="#5E8F4E"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 260">${body}<rect x="10" y="226" width="118" height="24" rx="12" fill="#0F172A" opacity=".72"/><text x="69" y="242" font-family="Inter,Arial" font-size="12" font-weight="600" fill="#fff" text-anchor="middle">Demo photo</text></svg>`;
  return svg;
}
