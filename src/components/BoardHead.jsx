export function BoardHead({ event, meta, round = 'Round 4 of 6' }) {
  return (
    <div className="bd-head">
      <div className="bd-eyebrow">
        <span className="live-dot" />
        <span>Live · {round}</span>
      </div>
      <h2 className="bd-title">{event}</h2>
      <div className="bd-meta">{meta}</div>
    </div>
  );
}
