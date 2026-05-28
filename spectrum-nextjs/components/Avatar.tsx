const GRADS: [string, string][] = [
  ['#f97316','#ec4899'],
  ['#06b6d4','#3b82f6'],
  ['#10b981','#06b6d4'],
  ['#8b5cf6','#ec4899'],
  ['#f59e0b','#ef4444'],
  ['#3b82f6','#8b5cf6'],
];

function gradFor(name: string): [string, string] {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h + name.charCodeAt(i) * 31) % GRADS.length;
  return GRADS[h];
}

interface AvatarProps {
  name?: string;
  size?: number;
}

export default function Avatar({ name = 'A', size = 32 }: AvatarProps) {
  const [c1, c2] = gradFor(name);
  const init = name.split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg,${c1},${c2})`,
        color: '#fff',
        fontWeight: 600,
        fontSize: Math.round(size * 0.38),
        display: 'grid',
        placeItems: 'center',
        flex: 'none',
      }}
    >
      {init}
    </div>
  );
}
