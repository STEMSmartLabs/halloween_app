/**
 * @file candy_brew_game.js
 * @brief Master Recipe State Manager with 3-Level Goody Box Unlock (5-3-8) & Restart Flow
 */

class CandyBrewGame {
  constructor() {
    this.currentLevelIndex = 0; // 0: Level 1, 1: Level 2, 2: Level 3
    this.currentStepIndex = 0;
    this.isGameCompleted = false;

    // Surprise Goody Box 3-Digit Combination Key (538)
    this.unlockKey = ['5', '3', '8'];
    this.revealedDigits = [false, false, false];

    // Wand Level Progression (1: Apprentice, 2: Candy Mage, 3: Master Choco-Sorcerer)
    this.wandLevel = 1;

    // Spell Combo Tracker
    this.comboCount = 0;
    this.lastGestureTime = 0;
    this.lastIngredientAddedTime = 0;
    this.lastGestureHandledTime = 0;

    // 3 Halloween Magic Levels (Progressive Difficulty)
    this.recipes = [
      {
        level: 1,
        id: 'pumpkin_spice_glow',
        name: 'Pumpkin Spice Choco-Elixir',
        icon: '🎃',
        tag: 'Level 1: Apprentice Brew',
        liquidColor: '#22c55e', 
        glowColor: 'rgba(34, 197, 94, 0.95)',
        revealDigit: '5',
        steps: [
          { type: 'ingredient', item: 'pumpkin', count: 2, initialCount: 2, name: 'Mini Pumpkins', icon: '🎃' },
          { type: 'ingredient', item: 'apple', count: 3, initialCount: 3, name: 'Apples', icon: '🍎' },
          { type: 'ingredient', item: 'orange', count: 2, initialCount: 2, name: 'Oranges', icon: '🍊' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Stir Cauldron', icon: '🔄', needed: 3, initialNeeded: 3 }
        ]
      },
      {
        level: 2,
        id: 'citrus_berry_blast',
        name: 'Citrus Berry Choco-Potion',
        icon: '🍓',
        tag: 'Level 2: Candy Mage Potion',
        liquidColor: '#a855f7', 
        glowColor: 'rgba(168, 85, 247, 0.95)',
        revealDigit: '3',
        steps: [
          { type: 'ingredient', item: 'strawberry', count: 3, initialCount: 3, name: 'Strawberries', icon: '🍓' },
          { type: 'ingredient', item: 'orange', count: 3, initialCount: 3, name: 'Oranges', icon: '🍊' },
          { type: 'ingredient', item: 'pumpkin', count: 2, initialCount: 2, name: 'Mini Pumpkins', icon: '🎃' },
          { type: 'ingredient', item: 'apple', count: 2, initialCount: 2, name: 'Apples', icon: '🍎' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Stir Cauldron', icon: '🔄', needed: 4, initialNeeded: 4 }
        ]
      },
      {
        level: 3,
        id: 'grand_master_brew',
        name: "Grand Master Choco-Cauldron",
        icon: '🍫',
        tag: 'Level 3: Grand Master Elixir',
        liquidColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.95)',
        revealDigit: '8',
        steps: [
          { type: 'ingredient', item: 'apple', count: 3, initialCount: 3, name: 'Apples', icon: '🍎' },
          { type: 'ingredient', item: 'strawberry', count: 3, initialCount: 3, name: 'Strawberries', icon: '🍓' },
          { type: 'ingredient', item: 'pumpkin', count: 3, initialCount: 3, name: 'Mini Pumpkins', icon: '🎃' },
          { type: 'ingredient', item: 'orange', count: 3, initialCount: 3, name: 'Oranges', icon: '🍊' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Grand Master Stir', icon: '🔄', needed: 5, initialNeeded: 5 }
        ]
      }
    ];

    this.addedIngredients = [];

    this.initUI();
    this.attachGestureListener();
  }

  initUI() {
    this.renderCurrentRecipe();
    this.updateCandyDisplay();
    this.updateGoodyBoxUI();
    this.updateWandLevelUI();
    
    // Attach click listeners to ingredient cards
    document.querySelectorAll('.ingredient-card').forEach(card => {
      card.addEventListener('click', () => {
        this.addIngredient(card.dataset.ingredient, card);
      });
    });

    // Attach Restart listeners
    const restartBtn = document.getElementById('btn-restart-game');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }

    const victoryRestartBtn = document.getElementById('btn-victory-restart');
    if (victoryRestartBtn) {
      victoryRestartBtn.addEventListener('click', () => this.restartGame());
    }
  }

  attachGestureListener() {
    if (window.gestureEngine) {
      window.gestureEngine.onGesture((gestureId, intensity) => {
        this.handleGestureInput(gestureId, intensity);
      });
    }
  }

  getCurrentRecipe() {
    return this.recipes[this.currentLevelIndex];
  }

  getCurrentStep() {
    const recipe = this.getCurrentRecipe();
    if (!recipe || this.currentStepIndex >= recipe.steps.length) return null;
    return recipe.steps[this.currentStepIndex];
  }

  getLevelPercentage(lvlIdx) {
    if (lvlIdx < this.currentLevelIndex || this.isGameCompleted) {
      return 100;
    }
    if (lvlIdx > this.currentLevelIndex) {
      return 0;
    }

    const recipe = this.recipes[lvlIdx];
    if (!recipe) return 0;

    let totalSubActions = 0;
    let completedSubActions = 0;

    for (let i = 0; i < recipe.steps.length; i++) {
      const step = recipe.steps[i];
      const maxCount = step.initialCount || step.initialNeeded || (step.type === 'ingredient' ? step.count : step.needed) || 1;
      totalSubActions += maxCount;

      if (i < this.currentStepIndex) {
        completedSubActions += maxCount;
      } else if (i === this.currentStepIndex) {
        const remaining = step.type === 'ingredient' ? (step.count || 0) : (step.needed || 0);
        completedSubActions += Math.max(0, maxCount - remaining);
      }
    }

    if (totalSubActions === 0) return 0;
    return Math.min(100, Math.round((completedSubActions / totalSubActions) * 100));
  }

  renderCurrentRecipe() {
    const recipe = this.getCurrentRecipe();
    if (!recipe) return;

    const currentStep = this.getCurrentStep();

    // Highlight needed ingredient cards
    document.querySelectorAll('.ingredient-card').forEach(card => {
      const type = card.dataset.ingredient;
      if (currentStep && currentStep.type === 'ingredient' && currentStep.item === type) {
        card.classList.add('needed');
      } else {
        card.classList.remove('needed');
      }
    });

    // Update Top Instruction HUD
    const recipeTitleEl = document.getElementById('active-recipe-title');
    const actionTextEl = document.getElementById('action-instruction-text');

    if (recipeTitleEl) {
      recipeTitleEl.textContent = `${recipe.icon} ${recipe.name}`;
    }

    if (actionTextEl) {
      if (currentStep) {
        if (currentStep.type === 'ingredient') {
          const icon = currentStep.icon || '🍎';
          const dirHints = {
            apple: '⬅️ Left',
            strawberry: '➡️ Right',
            orange: '⬆️ Up',
            pumpkin: '⬇️ Down'
          };
          const hint = dirHints[currentStep.item] ? ` (${dirHints[currentStep.item]})` : '';
          actionTextEl.textContent = `${icon} Toss ${currentStep.count || 1} ${currentStep.name}${hint}`;
        } else if (currentStep.type === 'gesture') {
          const repeatStr = currentStep.needed && currentStep.needed > 1 ? ` (${currentStep.needed}x)` : '';
          actionTextEl.textContent = `${currentStep.icon} ${currentStep.name} (🔄 Circle)${repeatStr}`;
        } else {
          actionTextEl.textContent = `${currentStep.name}`;
        }
      } else {
        actionTextEl.textContent = "✨ Level Recipe Ready!";
      }
    }

    // Update Spellcasting Metronome Ring in Particle Engine
    if (window.particleEngine) {
      if (currentStep && currentStep.type === 'gesture') {
        window.particleEngine.setSpellTarget(
          currentStep.gestureType || 'stir',
          currentStep.name,
          currentStep.icon,
          currentStep.needed || 1
        );
      } else if (currentStep && currentStep.type === 'ingredient') {
        window.particleEngine.setSpellTarget(
          'toss',
          `Toss ${currentStep.count} ${currentStep.name}`,
          currentStep.icon,
          currentStep.count
        );
      } else {
        window.particleEngine.clearSpellTarget();
      }

      window.particleEngine.setLiquidColor(recipe.liquidColor, recipe.glowColor);
    }
  }

  getEmojiForItem(itemType) {
    const itemEmojis = {
      strawberry: '🍓',
      orange: '🍊',
      apple: '🍎',
      pumpkin: '🎃'
    };
    return itemEmojis[itemType] || '🍬';
  }

  addIngredient(itemType, fromElement) {
    const now = performance.now();
    // 500ms debounce guard
    if (now - this.lastIngredientAddedTime < 500) {
      return;
    }
    this.lastIngredientAddedTime = now;

    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    // During Stir/Gesture step, completely disallow adding ingredients!
    if (currentStep.type !== 'ingredient') {
      return;
    }

    const emoji = this.getEmojiForItem(itemType);

    // Invalid Item Attempted during Ingredient step -> Throw and Burst in Mid-Air!
    if (currentStep.item !== itemType) {
      if (window.particleEngine) {
        window.particleEngine.throwIngredient(fromElement, emoji, '#ef4444', false);
      }
      this.comboCount = 0;
      return;
    }

    // Valid Ingredient: Fly into Cauldron and advance step
    this.addedIngredients.unshift(itemType);
    if (this.addedIngredients.length > 5) {
      this.addedIngredients.pop();
    }

    if (window.particleEngine) {
      window.particleEngine.throwIngredient(fromElement, emoji, this.getCurrentRecipe().liquidColor, true);
    }

    currentStep.count--;
    this.triggerComboHit();

    if (currentStep.count <= 0) {
      this.showFloatingFeedback(`✨ Great Job! ${emoji} Added!`);
      this.advanceStep();
    } else {
      this.showFloatingFeedback(`Added! Need ${currentStep.count} more ${emoji}`);
      this.renderCurrentRecipe();
    }

    this.updateCandyDisplay();
  }

  // =========================================================================
  // GESTURE COMBO MULTIPLIER
  // =========================================================================
  triggerComboHit() {
    const now = performance.now();
    if (now - this.lastGestureTime < 4500) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastGestureTime = now;

    if (this.comboCount >= 2) {
      if (window.halloweenAudio) {
        window.halloweenAudio.playComboJingle(this.comboCount);
      }
      this.showFloatingFeedback(`🔥 COMBO x${this.comboCount}! SPELL POWER BOOST!`);
    }
  }

  handleGestureInput(gestureId, intensity) {
    if (!gestureId || gestureId === 0) return;

    const now = performance.now();
    if (now - this.lastGestureHandledTime < 500) {
      return;
    }
    this.lastGestureHandledTime = now;

    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    // Directional actions to ingredient item mapping:
    // 2: Up -> orange
    // 3: Down -> pumpkin
    // 4: Left -> apple
    // 5: Right -> strawberry
    const dirToItem = {
      2: 'orange',
      3: 'pumpkin',
      4: 'apple',
      5: 'strawberry'
    };

    // 1. INGREDIENT STEP:
    if (currentStep.type === 'ingredient') {
      const movedItem = dirToItem[gestureId];
      if (movedItem) {
        const targetCard = document.querySelector(`.ingredient-card[data-ingredient="${movedItem}"]`);
        this.addIngredient(movedItem, targetCard || document.body);
      }
      return;
    }

    // 2. GESTURE / STIR STEP:
    // During Stir phase, ONLY accept stir gesture (ID: 1). Completely ignore any linear directional gestures!
    if (currentStep.type === 'gesture') {
      const isMatch = (currentStep.gestureId === gestureId) || 
                      (gestureId === 1 && currentStep.gestureType === 'stir');

      if (isMatch) {
        if (window.particleEngine) {
          window.particleEngine.triggerSpellEffect(gestureId);
        }
        this.triggerComboHit();

        if (currentStep.needed) {
          currentStep.needed--;
          if (currentStep.needed <= 0) {
            this.showFloatingFeedback(`✨ ${currentStep.name} Complete!`);
            this.advanceStep();
          } else {
            this.showFloatingFeedback(`🌟 Good! Stir ${currentStep.needed} more time(s)!`);
            this.renderCurrentRecipe();
          }
        } else {
          this.advanceStep();
        }
        this.updateCandyDisplay();
      }
      // Non-stir gestures are completely suppressed during stir phase
      return;
    }
  }

  advanceStep() {
    this.currentStepIndex++;
    const recipe = this.getCurrentRecipe();

    if (this.currentStepIndex >= recipe.steps.length) {
      this.completeRecipe(recipe);
    } else {
      this.renderCurrentRecipe();
      this.updateCandyDisplay();
    }
  }

  completeRecipe(recipe) {
    const lvlIdx = this.currentLevelIndex;
    console.log(`[Game] Level ${lvlIdx + 1} Complete: ${recipe.name}`);

    // Reveal this level's secret lock digit!
    this.revealedDigits[lvlIdx] = true;
    const revealedDigit = this.unlockKey[lvlIdx];

    // Sound & VFX
    if (window.halloweenAudio) {
      window.halloweenAudio.playDigitUnlockSound();
    }
    if (window.particleEngine) {
      window.particleEngine.spawnCelebrationBurst();
    }

    this.checkWandLevelUp();
    this.updateCandyDisplay();
    this.updateGoodyBoxUI();

    this.showFloatingFeedback(`🎉 LEVEL ${lvlIdx + 1} COMPLETE! Lock Digit Revealed: [ ${revealedDigit} ]`);

    setTimeout(() => {
      if (this.currentLevelIndex < 2) {
        // Advance to next level
        this.currentLevelIndex++;
        this.currentStepIndex = 0;
        this.comboCount = 0;
        this.renderCurrentRecipe();
        this.updateCandyDisplay();
        this.updateGoodyBoxUI();
      } else {
        // All 3 Levels Finished!
        this.triggerGameFinish();
      }
    }, 2400);
  }

  triggerGameFinish() {
    this.isGameCompleted = true;
    this.updateCandyDisplay();
    this.updateGoodyBoxUI();

    if (window.halloweenAudio) {
      window.halloweenAudio.playGrandLockUnlockedFanfare();
    }
    if (window.particleEngine) {
      window.particleEngine.spawnCelebrationBurst();
      setTimeout(() => window.particleEngine.spawnCelebrationBurst(), 600);
    }

    const victoryModal = document.getElementById('victory-modal');
    if (victoryModal) {
      victoryModal.style.display = 'flex';
    }
  }

  restartGame() {
    console.log("[Game] Restarting Halloween Magic Wand Game!");
    this.currentLevelIndex = 0;
    this.currentStepIndex = 0;
    this.isGameCompleted = false;
    this.revealedDigits = [false, false, false];
    this.wandLevel = 1;
    this.comboCount = 0;
    this.addedIngredients = [];

    // Reset recipe step counts to initial values
    this.recipes.forEach(r => {
      r.steps.forEach(s => {
        if (s.type === 'ingredient') s.count = s.initialCount;
        if (s.type === 'gesture') s.needed = s.initialNeeded;
      });
    });

    const victoryModal = document.getElementById('victory-modal');
    if (victoryModal) {
      victoryModal.style.display = 'none';
    }

    if (window.halloweenAudio) {
      window.halloweenAudio.playRestartSound();
    }

    this.renderCurrentRecipe();
    this.updateCandyDisplay();
    this.updateGoodyBoxUI();
    this.updateWandLevelUI();

    this.showFloatingFeedback("✨ Game Restarted! Level 1 Ready!");
  }

  // =========================================================================
  // WAND LEVEL PROGRESSION
  // =========================================================================
  checkWandLevelUp() {
    let newLevel = 1;
    const revealedCount = this.revealedDigits.filter(Boolean).length;
    if (revealedCount >= 3) {
      newLevel = 3; // Master Choco-Sorcerer
    } else if (revealedCount >= 2) {
      newLevel = 2; // Candy Mage
    }

    if (newLevel > this.wandLevel) {
      this.wandLevel = newLevel;
      if (window.particleEngine) {
        window.particleEngine.setWandLevel(this.wandLevel);
      }
      this.updateWandLevelUI();

      const levelNames = {
        2: '🌟 LEVEL 2: CANDY MAGE (Fiery Ribbon Unlocked!)',
        3: '👑 LEVEL 3: MASTER CHOCO-SORCERER (Rainbow Ribbon Unlocked!)'
      };
      this.showFloatingFeedback(`🎉 WAND EVOLVED! ${levelNames[this.wandLevel]}`);
    }
  }

  updateWandLevelUI() {
    const levelBadgeEl = document.getElementById('wand-level-badge');
    if (levelBadgeEl) {
      const titles = {
        1: '⭐ Lvl 1: Apprentice',
        2: '🌟 Lvl 2: Candy Mage',
        3: '👑 Lvl 3: Choco-Sorcerer'
      };
      levelBadgeEl.textContent = titles[this.wandLevel] || '⭐ Lvl 1: Apprentice';
      levelBadgeEl.className = `wand-level-tag lvl-${this.wandLevel}`;
    }
  }

  showFloatingFeedback(text) {
    const feedbackEl = document.getElementById('spell-feedback');
    if (feedbackEl) {
      if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
      feedbackEl.textContent = text;
      feedbackEl.classList.remove('show', 'bust');
      if (text.includes('BUST') || text.includes('❌')) {
        feedbackEl.classList.add('bust');
      }
      void feedbackEl.offsetWidth; // Reflow to restart animation
      feedbackEl.classList.add('show');
      this.feedbackTimer = setTimeout(() => feedbackEl.classList.remove('show', 'bust'), 2600);
    }
  }

  updateCandyDisplay() {
    const activeBadgeEl = document.getElementById('active-level-badge');
    const overallPctEl = document.getElementById('candy-percent-text');
    const fractionEl = document.getElementById('candy-fraction');

    const pcts = [
      this.getLevelPercentage(0),
      this.getLevelPercentage(1),
      this.getLevelPercentage(2)
    ];

    for (let i = 1; i <= 3; i++) {
      const fillEl = document.getElementById(`level-seg-fill-${i}`);
      const pctEl = document.getElementById(`level-seg-pct-${i}`);
      const pct = pcts[i - 1];

      if (fillEl) fillEl.style.width = `${pct}%`;
      if (pctEl) pctEl.textContent = `${pct}%`;
    }

    const currentLvlNum = Math.min(3, this.currentLevelIndex + 1);
    const curPct = pcts[this.currentLevelIndex] !== undefined ? pcts[this.currentLevelIndex] : 100;

    if (activeBadgeEl) {
      if (this.isGameCompleted) {
        activeBadgeEl.textContent = `👑 All 3 Levels Complete!`;
      } else {
        activeBadgeEl.textContent = `⭐ Level ${currentLvlNum} of 3`;
      }
    }

    if (overallPctEl) {
      if (this.isGameCompleted) {
        overallPctEl.textContent = `🎉 Goody Box Code: 538`;
      } else {
        overallPctEl.textContent = `Level ${currentLvlNum}: ${curPct}% Complete`;
      }
    }

    if (fractionEl) {
      const finishedCount = this.revealedDigits.filter(Boolean).length;
      fractionEl.textContent = `${finishedCount} / 3 Levels Finished`;
    }
  }

  updateGoodyBoxUI() {
    const statusBadgeEl = document.getElementById('goody-lock-status-badge');
    const subtextEl = document.getElementById('goody-box-subtext');
    const restartBtn = document.getElementById('btn-restart-game');

    for (let i = 1; i <= 3; i++) {
      const digitBox = document.getElementById(`lock-digit-${i}`);
      const isRevealed = this.revealedDigits[i - 1];
      const digitVal = this.unlockKey[i - 1];

      if (digitBox) {
        if (isRevealed) {
          digitBox.className = 'lock-digit-box unlocked';
          digitBox.innerHTML = `<span class="digit-icon">🔓</span><span class="digit-val">${digitVal}</span>`;
        } else {
          digitBox.className = 'lock-digit-box locked';
          digitBox.innerHTML = `<span class="digit-icon">🔒</span><span class="digit-val">?</span>`;
        }
      }
    }

    const revealedCount = this.revealedDigits.filter(Boolean).length;

    if (statusBadgeEl) {
      if (this.isGameCompleted || revealedCount === 3) {
        statusBadgeEl.className = 'goody-lock-status-badge unlocked';
        statusBadgeEl.textContent = '🔓 UNLOCKED: 538';
      } else {
        statusBadgeEl.className = 'goody-lock-status-badge';
        statusBadgeEl.textContent = `🔒 LOCKED (${revealedCount}/3 Levels)`;
      }
    }

    if (subtextEl) {
      if (this.isGameCompleted) {
        subtextEl.textContent = '🎉 SECRET CODE REVEALED: 5-3-8! Use code to open Goody Box!';
      } else if (revealedCount === 0) {
        subtextEl.textContent = 'Complete Level 1 to reveal the 1st lock digit!';
      } else if (revealedCount === 1) {
        subtextEl.textContent = '✨ Level 1 Done! 1st Digit is 5. Complete Level 2 for Digit 2!';
      } else if (revealedCount === 2) {
        subtextEl.textContent = '✨ Level 2 Done! 2nd Digit is 3. Complete Level 3 for Final Digit!';
      }
    }

    if (restartBtn) {
      restartBtn.style.display = (this.isGameCompleted || revealedCount > 0) ? 'inline-block' : 'none';
    }
  }
}

// Global Candy Brew Game instance
window.candyGame = null;
