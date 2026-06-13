export function BoardHead({ event, meta, live }) {
  return (
    <div className="bd-head">
      <div className="bd-eyebrow">
        <span className="live-dot" />
        <span>{live}</span>
      </div>
      <h2 className="bd-title">{event}</h2>
      <div className="bd-meta">{meta}</div>
    </div>
  );
}
