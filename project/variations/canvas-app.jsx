const { DesignCanvas, DCSection, DCArtboard, DCPostIt, LJBoardA, LJBoardB, LJBoardC, HJBoardA, HJBoardB } = window;

function CanvasApp() {
  return (
    <DesignCanvas title="Field Events Live — spectator leaderboard explorations">
      <DCSection
        id="notes"
        title="Context & assumptions"
        subtitle="Read me first — what these mocks assume"
      >
        <DCPostIt width={300} left={0} top={0} rotate={-1.5}>
          <b>Assumptions</b><br />
          · Spectator view is phone-first (390px frames here).<br />
          · Imperial (ft-in) default, metric toggle in the app.<br />
          · Demo state: LJ round 4 of 6 in progress; HJ bar at 5-02.<br />
          · "Live" = officials' entries sync instantly; new marks will pulse gold in the real app.
        </DCPostIt>
        <DCPostIt width={300} left={360} top={0} rotate={1.5}>
          <b>What varies</b><br />
          A — by-the-book editorial table (paper, podium tinting).<br />
          B — same structure, inverted navy "stadium board".<br />
          C — rotation-first: who's jumping NOW gets a hero card; attempts compress to dots.<br />
          High jump grid shown in light + navy.
        </DCPostIt>
      </DCSection>

      <DCSection
        id="lj"
        title="Long jump · leaderboard"
        subtitle="Rank, six attempts, best mark, up-next rotation"
      >
        <DCArtboard id="lj-a" label="A · Editorial table" width={390}>
          <LJBoardA />
        </DCArtboard>
        <DCArtboard id="lj-b" label="B · Stadium board" width={390}>
          <LJBoardB />
        </DCArtboard>
        <DCArtboard id="lj-c" label="C · Pit view" width={390}>
          <LJBoardC />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="hj"
        title="High jump · bar-height grid"
        subtitle="Heights as columns, O/X/— per cell, current bar highlighted"
      >
        <DCArtboard id="hj-a" label="A · Light grid" width={390}>
          <HJBoardA />
        </DCArtboard>
        <DCArtboard id="hj-b" label="B · Navy grid" width={390}>
          <HJBoardB />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<CanvasApp />);
