// Compute "balanced" version of a card.
export function balanceCard(c) {
  if (c.type !== "Creature") {
    if (c.usage > 0.7) return { ...c, cost: Math.min(10, c.cost + 1), _delta: { cost: 1 }, _reason: "high usage → cost ↑" };
    if (c.usage < 0.3) return { ...c, cost: Math.max(0, c.cost - 1), _delta: { cost: -1 }, _reason: "low usage → cost ↓" };
    return { ...c, _delta: {}, _reason: "no change · already balanced" };
  }
  const ratio = (c.attack + c.defense) / Math.max(1, c.cost);
  let nc = { ...c }, delta = {}, reason;
  if (ratio > 3.0) {
    if (c.usage > 0.65) {
      nc.cost = Math.min(10, c.cost + 1);
      nc.attack = Math.max(0, c.attack - 1);
      delta = { cost: 1, attack: -1 };
      reason = "overpowered + over-used → nerf";
    } else {
      nc.attack = Math.max(0, c.attack - 1);
      delta = { attack: -1 };
      reason = "overpowered → trim atk";
    }
  } else if (ratio < 1.8) {
    if (c.usage < 0.4) {
      nc.cost = Math.max(0, c.cost - 1);
      nc.defense = c.defense + 1;
      delta = { cost: -1, defense: 1 };
      reason = "underpowered + under-used → buff";
    } else {
      nc.defense = c.defense + 1;
      delta = { defense: 1 };
      reason = "underpowered → buff def";
    }
  } else {
    reason = "ratio in band · no change";
  }
  nc._delta = delta;
  nc._reason = reason;
  nc._origRatio = ratio;
  nc._newRatio = (nc.attack + nc.defense) / Math.max(1, nc.cost);
  return nc;
}

export function unbalanceCard(c, i) {
  if (c.type !== "Creature") return { ...c };
  if (i % 3 === 0) return { ...c, attack: c.attack + 2, _injected: "overpowered" };
  if (i % 4 === 0) return { ...c, cost: c.cost + 2, _injected: "underpowered" };
  return { ...c };
}
