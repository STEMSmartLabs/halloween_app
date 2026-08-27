/**
 * @file candy_brew_game.js
 * @brief Master Recipe State Manager with Wand Progression & Combo Multipliers
 */

class CandyBrewGame {
  constructor() {
    this.currentRecipeIndex = 0;
    this.currentStepIndex = 0;
    this.totalCandy = 75;

    // Wand Level Progression (Idea 2)
    this.wandLevel = 1; // 1: Apprentice, 2: Candy Mage, 3: Master Choco-Sorcerer

    // Spell Combo Tracker (Idea 2)
    this.comboCount = 0;
    this.lastGestureTime = 0;

    // Updated harvest recipes (Fruits & Vegetables only, leading to Chocolate Eruptions)
    this.recipes = [
      {
        id: 'pumpkin_spice_glow',
        name: 'Pumpkin Spice Choco-Elixir',
        icon: '🎃',
        tag: 'Halloween Magic Recipe',
        liquidColor: '#22c55e', 
        glowColor: 'rgba(34, 197, 94, 0.95)',
        rewardCandy: 15,
        steps: [
          { type: 'ingredient', item: 'apple', count: 2, name: '2 Apples', icon: '🍎' },
          { type: 'ingredient', item: 'pumpkin', count: 1, name: '1 Mini Pumpkin', icon: '🎃' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Stir Cauldron', icon: '🔄', needed: 2 },
          { type: 'gesture', gestureId: 4, gestureType: 'slash', name: 'Ignite Flame', icon: '🔥', needed: 1 }
        ]
      },
      {
        id: 'harvest_moon_brew',
        name: 'Harvest Moon Choco-Truffle Brew',
        icon: '🌕',
        tag: 'Autumn Festival Recipe',
        liquidColor: '#a855f7', 
        glowColor: 'rgba(168, 85, 247, 0.95)',
        rewardCandy: 20,
        steps: [
          { type: 'ingredient', item: 'grapes', count: 2, name: '2 Grapes', icon: '🍇' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Stir Cauldron', icon: '🔄', needed: 3 },
          { type: 'gesture', gestureId: 2, gestureType: 'toss', name: 'Flick Wand In', icon: '🪄', needed: 1 },
          { type: 'gesture', gestureId: 6, gestureType: 'thrust', name: 'Cast Candy Blast', icon: '⚡', needed: 1 }
        ]
      },
      {
        id: 'candy_corn_sugar_rush',
        name: 'Candy Corn Chocolate Rush',
        icon: '🌽',
        tag: 'Sweet Tooth Alchemist Brew',
        liquidColor: '#facc15',
        glowColor: 'rgba(250, 204, 21, 0.95)',
        rewardCandy: 25,
        steps: [
          { type: 'ingredient', item: 'candycorn', count: 4, name: '4 Candy Corns', icon: '🌽' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Stir Smoothly', icon: '🔄', needed: 2 },
          { type: 'gesture', gestureId: 3, gestureType: 'bubble', name: 'Furious Shake', icon: '🫧', needed: 2 }
        ]
      },
      {
        id: 'ultimate_harvest_megabrew',
        name: "Ultimate Harvest Mega Choco-Brew",
        icon: '🍫',
        tag: 'Legendary Master Recipe',
        liquidColor: '#38bdf8',
        glowColor: 'rgba(56, 189, 248, 0.95)',
        rewardCandy: 35,
        steps: [
          { type: 'ingredient', item: 'carrot', count: 1, name: '1 Carrot', icon: '🥕' },
          { type: 'ingredient', item: 'candycorn', count: 3, name: '3 Candy Corns', icon: '🌽' },
          { type: 'ingredient', item: 'apple', count: 1, name: '1 Apple', icon: '🍎' },
          { type: 'gesture', gestureId: 1, gestureType: 'stir', name: 'Stir Cauldron', icon: '🔄', needed: 3 },
          { type: 'gesture', gestureId: 4, gestureType: 'slash', name: 'Ignite Mystic Fire', icon: '🔥', needed: 1 },
          { type: 'gesture', gestureId: 6, gestureType: 'thrust', name: 'Mega Chocolate Blast', icon: '⚡', needed: 1 }
        ]
      }
    ];

    this.addedIngredients = ['apple'];

    this.initUI();
    this.attachGestureListener();
  }

  initUI() {
    this.renderCurrentRecipe();
    this.updateCandyDisplay();
    this.updateAddedIngredientsSlots();
    this.updateWandLevelUI();
    
    // Attach click listeners to ingredient cards
    document.querySelectorAll('.ingredient-card').forEach(card => {
      card.addEventListener('click', () => {
        this.addIngredient(card.dataset.ingredient, card);
      });
    });
  }

  attachGestureListener() {
    if (window.gestureEngine) {
      window.gestureEngine.onGesture((gestureId, intensity) => {
        this.handleGestureInput(gestureId, intensity);
      });
    }
  }

  getCurrentRecipe() {
    return this.recipes[this.currentRecipeIndex];
  }

  getCurrentStep() {
    const recipe = this.getCurrentRecipe();
    if (!recipe || this.currentStepIndex >= recipe.steps.length) return null;
    return recipe.steps[this.currentStepIndex];
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
          actionTextEl.textContent = `Toss ${currentStep.name}`;
        } else if (currentStep.type === 'gesture') {
          const repeatStr = currentStep.needed && currentStep.needed > 1 ? ` (${currentStep.needed}x)` : '';
          actionTextEl.textContent = `${currentStep.icon} ${currentStep.name}${repeatStr}`;
        } else {
          actionTextEl.textContent = `${currentStep.name}`;
        }
      } else {
        actionTextEl.textContent = "✨ Recipe Ready!";
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

  updateAddedIngredientsSlots() {
    const slotsContainer = document.getElementById('added-ingredients-slots');
    if (!slotsContainer) return;
    
    const maxSlots = 5;
    slotsContainer.innerHTML = '';
    
    for (let i = 0; i < maxSlots; i++) {
      const slot = document.createElement('div');
      slot.className = 'slot';
      
      if (i < this.addedIngredients.length) {
        const item = this.addedIngredients[i];
        slot.classList.add('has-item');
        
        const itemSpan = document.createElement('span');
        itemSpan.className = 'slot-item';
        itemSpan.textContent = this.getEmojiForItem(item);
        slot.appendChild(itemSpan);
        
        if (i === 0) {
          const arrow = document.createElement('div');
          arrow.className = 'bouncing-green-arrow';
          arrow.textContent = '⬇️';
          slot.appendChild(arrow);
        }
      }
      slotsContainer.appendChild(slot);
    }
  }

  getEmojiForItem(itemType) {
    const itemEmojis = {
      apple: '🍎',
      grapes: '🍇',
      candycorn: '🌽',
      carrot: '🥕',
      pumpkin: '🎃'
    };
    return itemEmojis[itemType] || '🍬';
  }

  addIngredient(itemType, fromElement) {
    const currentStep = this.getCurrentStep();
    const emoji = this.getEmojiForItem(itemType);
    
    this.addedIngredients.unshift(itemType);
    if (this.addedIngredients.length > 5) {
      this.addedIngredients.pop();
    }
    this.updateAddedIngredientsSlots();

    if (window.particleEngine) {
      window.particleEngine.throwIngredient(fromElement, emoji, this.getCurrentRecipe().liquidColor);
    }

    if (currentStep && currentStep.type === 'ingredient' && currentStep.item === itemType) {
      currentStep.count--;
      this.triggerComboHit();

      if (currentStep.count <= 0) {
        this.showFloatingFeedback(`✨ Great Job! ${emoji} Added!`);
        this.advanceStep();
      } else {
        this.showFloatingFeedback(`Added! Need ${currentStep.count} more ${emoji}`);
        this.renderCurrentRecipe();
      }
    } else {
      this.showFloatingFeedback(`Tossed ${emoji} into brew!`);
    }
    
    this.updateBrewStatusEffects();
  }
  
  updateBrewStatusEffects() {
    const effectsEl = document.getElementById('status-effects');
    if (!effectsEl) return;
    
    const possibleEffects = [
      "Candy munky", "Swom tacore", "Irraciamis", "Glow burst", 
      "Sugar rush", "Harvest shine", "Sweet aura", "Mystic pop",
      "Choco melt", "Cocoa swirl"
    ];
    
    const shuffled = [...possibleEffects].sort(() => 0.5 - Math.random());
    effectsEl.innerHTML = `
      <div class="effect-line">Current effects: ${shuffled[0]}</div>
      <div class="effect-line">Current effects: ${shuffled[1]}</div>
      <div class="effect-line">Current effects: ${shuffled[2]}</div>
    `;
  }

  // =========================================================================
  // GESTURE COMBO MULTIPLIER (IDEA 2)
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
    if (window.particleEngine) {
      window.particleEngine.triggerSpellEffect(gestureId);
    }

    if (window.monsterDefense && window.monsterDefense.isActive) {
      window.monsterDefense.handleGesture(gestureId);
    }

    const currentStep = this.getCurrentStep();
    if (!currentStep) return;

    const gestureNames = {
      1: '🔄 Stir Cauldron',
      2: '🪄 Flick / Toss',
      3: '🫧 Shake / Bubble',
      4: '🔥 Downward Slash',
      5: '💨 Horizontal Wave',
      6: '⚡ Thrust / Blast'
    };

    // Suppress Idle / None gestures
    if (!gestureId || gestureId === 0) return;

    // 1. INGREDIENT STEP: Only intentional Wand Flick (2), Thrust (6), or Button A tosses the ingredient!
    if (currentStep.type === 'ingredient') {
      if (gestureId === 2 || gestureId === 6) {
        const neededItem = currentStep.item;
        const targetCard = document.querySelector(`.ingredient-card[data-ingredient="${neededItem}"]`);
        this.addIngredient(neededItem, targetCard || document.body);
      }
      return;
    }

    // 2. GESTURE STEP: Check matching gesture
    if (currentStep.type === 'gesture') {
      const isMatch = (currentStep.gestureId === gestureId) || 
                      (gestureId === 1 && currentStep.gestureType === 'stir') ||
                      (gestureId === 2 && currentStep.gestureType === 'toss') ||
                      (gestureId === 3 && currentStep.gestureType === 'bubble') ||
                      (gestureId === 4 && currentStep.gestureType === 'slash') ||
                      (gestureId === 6 && currentStep.gestureType === 'thrust');

      if (isMatch) {
        this.triggerComboHit();

        if (currentStep.needed) {
          currentStep.needed--;
          if (currentStep.needed <= 0) {
            this.showFloatingFeedback(`✨ ${currentStep.name} Complete!`);
            this.advanceStep();
          } else {
            this.showFloatingFeedback(`🌟 Good! Repeat ${currentStep.needed} more times!`);
            this.renderCurrentRecipe();
          }
        } else {
          this.advanceStep();
        }
      } else {
        // Helpful feedback on different movement
        this.showFloatingFeedback(`Sensed ${gestureNames[gestureId] || 'Wand Action'}! Need ${currentStep.icon} ${currentStep.name}`);
      }
    }
  }

  advanceStep() {
    this.currentStepIndex++;
    const recipe = this.getCurrentRecipe();

    if (this.currentStepIndex >= recipe.steps.length) {
      this.completeRecipe(recipe);
    } else {
      this.renderCurrentRecipe();
    }
  }

  completeRecipe(recipe) {
    console.log(`[Game] Brew Complete: ${recipe.name}`);
    const bonus = this.comboCount >= 3 ? 10 : 0;
    const earned = recipe.rewardCandy + bonus;
    this.totalCandy = Math.min(100, this.totalCandy + earned);
    
    this.checkWandLevelUp();
    this.updateCandyDisplay();

    if (window.particleEngine) window.particleEngine.spawnCelebrationBurst();
    if (window.halloweenAudio) window.halloweenAudio.playRecipeCompleteFanfare();

    const bonusText = bonus > 0 ? ` (+${bonus} Combo Bonus!)` : '';
    this.showFloatingFeedback(`🍫 ${recipe.name} ERUPTION! +${earned} Treats!${bonusText}`);

    setTimeout(() => {
      this.currentRecipeIndex = (this.currentRecipeIndex + 1) % this.recipes.length;
      this.currentStepIndex = 0;
      this.comboCount = 0;
      this.renderCurrentRecipe();
    }, 2800);
  }

  // =========================================================================
  // WAND LEVEL PROGRESSION (IDEA 2)
  // =========================================================================
  checkWandLevelUp() {
    let newLevel = 1;
    if (this.totalCandy >= 100) {
      newLevel = 3; // Master Choco-Sorcerer
    } else if (this.totalCandy >= 85) {
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
      feedbackEl.classList.remove('show');
      void feedbackEl.offsetWidth; // Reflow to restart animation
      feedbackEl.classList.add('show');
      this.feedbackTimer = setTimeout(() => feedbackEl.classList.remove('show'), 2600);
    }
  }

  updateCandyDisplay() {
    const candyPercentEl = document.getElementById('candy-percent-text');
    const candyFillEl = document.getElementById('candy-progress-fill');
    const candyFractionEl = document.getElementById('candy-fraction');

    if (candyPercentEl) candyPercentEl.textContent = `${this.totalCandy}%`;
    if (candyFractionEl) candyFractionEl.textContent = `${this.totalCandy} / 100 Treats`;
    
    if (candyFillEl) {
      const percentage = Math.min(100, this.totalCandy);
      candyFillEl.style.width = `${percentage}%`;
    }
  }
}

// Global Candy Brew Game instance
window.candyGame = null;
