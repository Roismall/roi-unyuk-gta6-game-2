// Story jobs for Solmar Bay. Vera "Vee" Cruz, who runs the Palms Motel,
// hands Danny Cole eight jobs. Each job is a list of steps; the mission
// engine advances them as the player completes each one.
const JOBS = [
  {
    title: 'Job 1 — First Wheels',
    giver: 'Vee: "Need wheels, kid. Take any car on the street and bring it to my motel."',
    reward: 150,
    steps: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'goto', pos: 'motel', r: 120, text: 'Drive the car to the Palms Motel' }
    ]
  },
  {
    title: 'Job 2 — Cab Hustle',
    giver: 'Vee: "A cabbie owes me. Grab a taxi and run three fares. Keep the meter running."',
    reward: 250,
    steps: [
      { type: 'taxiCar', text: 'Find a taxi and get in (yellow cab, press E)' },
      { type: 'taxi', n: 3, text: 'Run taxi fares: pick up riders, drop them off' }
    ]
  },
  {
    title: 'Job 3 — Coin Collector',
    giver: 'Vee: "Sun coins. Tourists drop them all over the bay. Eight of them, and they are yours."',
    reward: 200,
    steps: [
      { type: 'collect', n: 8, text: 'Collect 8 sun coins around the city' }
    ]
  },
  {
    title: 'Job 4 — Heat Check',
    giver: 'Vee: "The cops need to know your face — then forget it. Get two stars, then lose them."',
    reward: 300,
    steps: [
      { type: 'stars', n: 2, text: 'Raise your wanted level to 2 stars (steal a car, cause trouble)' },
      { type: 'lose', text: 'Lose the heat — hide until the stars are gone' }
    ]
  },
  {
    title: 'Job 5 — Harbor Run',
    giver: 'Vee: "A crate truck is waiting at the docks. Take it to the warehouse. No questions."',
    reward: 500,
    steps: [
      { type: 'stealType', carType: 'Truck', pos: 'docks', text: 'Steal the crate truck at the Harbor Docks' },
      { type: 'deliver', pos: 'warehouse', r: 140, text: 'Deliver the truck to the Harbor Warehouse' }
    ]
  },
  {
    title: 'Job 6 — Getaway',
    giver: 'Vee: "Time to show the Bay PD your taillights. Three stars, then vanish at the airstrip."',
    reward: 600,
    steps: [
      { type: 'stars', n: 3, text: 'Raise your wanted level to 3 stars' },
      { type: 'escape', pos: 'airstrip', r: 160, text: 'Escape to the Solmar Airstrip with the heat on' }
    ]
  },
  {
    title: 'Job 7 — Beach Dash',
    giver: 'Vee: "A buyer is timing you. Five checkpoints down the beach road, fast."',
    reward: 700,
    steps: [
      { type: 'checkpoints', text: 'Drive through all 5 beach checkpoints' }
    ]
  },
  {
    title: 'Job 8 — The Big Score',
    giver: 'Vee: "The Venn Casino. One vault, one night. Get in, grab it, and get out clean."',
    reward: 2000,
    steps: [
      { type: 'goto', pos: 'casino', r: 130, text: 'Go to the Venn Casino' },
      { type: 'hold', secs: 5, text: 'Hold E to crack the vault (stay in the circle)' },
      { type: 'escape', pos: 'airstrip', r: 160, text: 'Four stars incoming — escape to the airstrip!' }
    ]
  }
];

const BEACH_CHECKPOINTS = [
  { x: 700, y: 3300 }, { x: 1500, y: 3300 }, { x: 2300, y: 3300 },
  { x: 3100, y: 3300 }, { x: 3900, y: 3300 }
];

function missionMarker(state) {
  const job = JOBS[state.job];
  if (!job) return null;
  const step = job.steps[state.step];
  if (!step) return null;
  if (step.type === 'goto' || step.type === 'deliver' || step.type === 'escape') {
    const lm = state.world.landmarks[step.pos];
    return lm ? { x: lm.x, y: lm.y, label: lm.label } : null;
  }
  if (step.type === 'stealType') {
    const lm = state.world.landmarks[step.pos];
    return lm ? { x: lm.x, y: lm.y, label: 'Crate truck' } : null;
  }
  if (step.type === 'checkpoints') {
    const cp = BEACH_CHECKPOINTS[state.cpIdx || 0];
    return cp ? { x: cp.x, y: cp.y, label: 'Checkpoint ' + ((state.cpIdx || 0) + 1) + '/5' } : null;
  }
  if (step.type === 'hold') {
    const lm = state.world.landmarks.casino;
    return lm ? { x: lm.x, y: lm.y, label: 'Vault' } : null;
  }
  if (state.taxiFare) return { x: state.taxiFare.x, y: state.taxiFare.y, label: state.taxiFare.kind === 'pickup' ? 'Rider' : 'Drop-off' };
  return null;
}

function missionText(state) {
  const job = JOBS[state.job];
  if (!job) return '';
  const step = job.steps[state.step];
  if (!step) return '';
  let t = step.text;
  if (step.type === 'collect') t += ' (' + state.coinsJob + '/' + step.n + ')';
  if (step.type === 'taxi') t += ' (' + state.faresDone + '/' + step.n + ')';
  if (step.type === 'hold') t += ' (' + Math.ceil(state.holdLeft || 0) + 's)';
  return t;
}
