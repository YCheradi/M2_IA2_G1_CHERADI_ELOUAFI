class BehaviorManager {
  static behaviors = [];

  constructor() {
    this.items = [];
  }

  add(behavior, weight = 1) {
    if (!behavior) return;
    let name = behavior.name || behavior.id || behavior.behaviorName;
    if (!name && typeof behavior === 'function') name = behavior.name;
    if (!name) return;

    let fn = behavior.fn || behavior.behavior || behavior;
    if (typeof fn !== 'function') return;

    let existing = this.items.find(b => b.name === name);
    if (existing) {
      existing.fn = fn;
      existing.weight = weight;
      existing.active = true;
      return;
    }

    this.items.push({ name, fn, weight, active: true });

    if (!BehaviorManager.behaviors.some(b => b.name === name)) {
      BehaviorManager.behaviors.push({ name, fn });
    }
  }

  remove(behavior) {
    let name = typeof behavior === 'string' ? behavior : (behavior && (behavior.name || behavior.id || behavior.behaviorName));
    if (!name) return;
    this.items = this.items.filter(b => b.name !== name);
  }

  deactivate(behavior) {
    let b = this.getBehavior(behavior);
    if (b) b.active = false;
  }

  activate(behavior) {
    let b = this.getBehavior(behavior);
    if (b) b.active = true;
  }

  changeWeight(behavior, weight) {
    let b = this.getBehavior(behavior);
    if (b && typeof weight === 'number') b.weight = weight;
  }

  getBehavior(name) {
    if (!name) return null;
    let key = typeof name === 'string' ? name : (name && (name.name || name.id || name.behaviorName));
    if (!key) return null;
    return this.items.find(b => b.name === key) || null;
  }

  getSteeringForce(vehicle, ctx = {}) {
    let total = createVector(0, 0);
    for (let b of this.items) {
      if (!b.active) continue;
      if (b.weight === 0) continue;
      let f = b.fn(vehicle, ctx);
      if (!f) continue;
      total.add(p5.Vector.mult(f, b.weight));
    }
    return total;
  }
}
