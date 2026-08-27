/**
 * @file monster_defense_game.js
 * @brief Spooky Monster Banishment Mini-Game (Defend the Candy Brew)
 */

class MonsterDefenseGame {
  constructor() {
    this.isActive = false;
    this.monsters = [];
    this.spawnTimer = null;
    this.score = 0;
    this.cauldronHealth = 100;
  }

  start() {
    this.isActive = true;
    this.monsters = [];
    this.score = 0;
    this.cauldronHealth = 100;
    console.log("[Defense] Halloween Monster Banishment Arena Started!");
    this.scheduleMonsterSpawns();
  }

  stop() {
    this.isActive = false;
    if (this.spawnTimer) clearTimeout(this.spawnTimer);
    this.monsters = [];
  }

  scheduleMonsterSpawns() {
    if (!this.isActive) return;
    this.spawnMonster();
    const delay = 1800 + Math.random() * 1500;
    this.spawnTimer = setTimeout(() => this.scheduleMonsterSpawns(), delay);
  }

  spawnMonster() {
    const types = [
      { name: 'Spooky Ghost', emoji: '👻', spell: 1, gestureName: 'Circle / Stir' },
      { name: 'Greedy Bat', emoji: '🦇', spell: 2, gestureName: 'Flick / Toss' },
      { name: 'Shadow Imp', emoji: '😈', spell: 4, gestureName: 'Vertical Slash' },
      { name: 'Slime Creeper', emoji: '🧟', spell: 3, gestureName: 'Shake' }
    ];

    const chosen = types[Math.floor(Math.random() * types.length)];
    const monster = {
      id: Date.now(),
      name: chosen.name,
      emoji: chosen.emoji,
      weakness: chosen.spell,
      gestureName: chosen.gestureName,
      x: Math.random() > 0.5 ? -40 : window.innerWidth + 40,
      y: 200 + Math.random() * 250,
      speed: 1.2 + Math.random() * 0.8
    };

    this.monsters.push(monster);
  }

  handleGesture(gestureId) {
    if (!this.isActive) return;

    // Check if any active monster is banished by this gesture
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i];
      if (m.weakness === gestureId) {
        // Monster Banished!
        this.score += 25;
        if (window.particleEngine) {
          window.particleEngine.spawnCelebrationBurst();
        }
        if (window.halloweenAudio) {
          window.halloweenAudio.playSpellBlast();
        }
        this.monsters.splice(i, 1);
        if (window.candyGame) {
          window.candyGame.showFloatingFeedback(`💥 ${m.name} BANISHED! +25 Candy!`);
        }
        break;
      }
    }
  }
}

window.monsterDefense = new MonsterDefenseGame();
