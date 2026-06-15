export function AuthOrbit() {
  return (
    <div className="auth-orbit" aria-hidden="true">
      <span />
      <svg viewBox="0 0 160 160">
        <defs>
          <path id="auth-orbit-path" d="M80 80 m -58 0 a 58 58 0 1 1 116 0 a 58 58 0 1 1 -116 0" />
        </defs>
        <text>
          <textPath href="#auth-orbit-path" startOffset="0%">
            SENTIR · ENTENDER · ELEGIR · VOLVER · CONSTRUIR ·
          </textPath>
        </text>
      </svg>
    </div>
  );
}
