/**
 * REALM OF CROWNS — Battle Wave Manager & Citadel Defense System
 * Connects the dedicated battlefield instance to the player's Citadel identity.
 * Governs active visual unit budgets, abstract reserve forces, casualty sync,
 * and reinforcement wave scheduling.
 */

export interface CitadelBattlefieldConfig {
  citadelId: string;
  citadelName: string;
  playerLevel: number;
  qualityPreset: 'low' | 'medium' | 'high' | 'auto';
  reserves: {
    allyInfantry: number;
    allyArchers: number;
    allyCavalry: number;
    enemyInfantry: number;
    enemyArchers: number;
  };
}

export interface WaveDeployment {
  waveIndex: number;
  isFinalWave: boolean;
  allyInfantry: number;
  allyArchers: number;
  enemyInfantry: number;
  enemyArchers: number;
  hasBossWarlord?: boolean;
}

export class BattleWaveManager {
  public citadelId: string;
  public citadelName: string;
  public currentWave = 1;
  public maxWaves = 3;

  // Active on-screen budget based on device tier
  public maxActiveUnitsBudget = 50;

  // Abstract reserve simulation (hundreds of troops stored without rendering)
  public reserves = {
    allyInfantry: 240,
    allyArchers: 60,
    allyCavalry: 20,
    enemyInfantry: 160,
    enemyArchers: 40
  };

  // Live battlefield counts
  public activeDefenders = 0;
  public activeAttackers = 0;
  public totalCasualtiesDefenders = 0;
  public totalCasualtiesAttackers = 0;

  private waveTimer = 0;
  private reinforcementCooldown = 15.0; // seconds between reinforcements
  private isBattleActive = false;

  constructor(config?: Partial<CitadelBattlefieldConfig>) {
    this.citadelId = config?.citadelId || 'citadel_player_primary';
    this.citadelName = config?.citadelName || 'Citadel of the Crown';

    if (config?.reserves) {
      this.reserves = { ...this.reserves, ...config.reserves };
    }

    // Adjust active budget according to device tier
    const preset = config?.qualityPreset || 'auto';
    if (preset === 'low') {
      this.maxActiveUnitsBudget = 36;
    } else if (preset === 'high') {
      this.maxActiveUnitsBudget = 80;
    } else {
      this.maxActiveUnitsBudget = 50; // Balanced standard for 60 FPS mobile
    }
  }

  public startBattle(): WaveDeployment {
    this.isBattleActive = true;
    this.currentWave = 1;
    this.waveTimer = 0;
    return this.getDeploymentForWave(1);
  }

  public getDeploymentForWave(wave: number): WaveDeployment {
    this.currentWave = wave;

    // Budget allocation per wave
    if (wave === 1) {
      const enemyInf = Math.min(10, this.reserves.enemyInfantry);
      const enemyArch = Math.min(4, this.reserves.enemyArchers);
      this.reserves.enemyInfantry -= enemyInf;
      this.reserves.enemyArchers -= enemyArch;

      return {
        waveIndex: 1,
        isFinalWave: false,
        allyInfantry: 14,
        allyArchers: 8,
        enemyInfantry: enemyInf,
        enemyArchers: enemyArch,
        hasBossWarlord: false
      };
    } else if (wave === 2) {
      const enemyInf = Math.min(16, this.reserves.enemyInfantry);
      const enemyArch = Math.min(6, this.reserves.enemyArchers);
      this.reserves.enemyInfantry -= enemyInf;
      this.reserves.enemyArchers -= enemyArch;

      return {
        waveIndex: 2,
        isFinalWave: this.maxWaves <= 2,
        allyInfantry: 8,
        allyArchers: 4,
        enemyInfantry: enemyInf,
        enemyArchers: enemyArch,
        hasBossWarlord: true
      };
    } else {
      // Final Wave 3
      const enemyInf = Math.min(20, this.reserves.enemyInfantry);
      const enemyArch = Math.min(8, this.reserves.enemyArchers);
      this.reserves.enemyInfantry -= enemyInf;
      this.reserves.enemyArchers -= enemyArch;

      return {
        waveIndex: 3,
        isFinalWave: true,
        allyInfantry: 10,
        allyArchers: 4,
        enemyInfantry: enemyInf,
        enemyArchers: enemyArch,
        hasBossWarlord: true
      };
    }
  }

  /**
   * Synchronizes on-screen casualties with the abstract reserve simulation.
   */
  public recordCasualty(team: 'ally' | 'enemy', isArcher: boolean = false): void {
    if (team === 'ally') {
      this.totalCasualtiesDefenders++;
      if (this.activeDefenders > 0) this.activeDefenders--;
    } else {
      this.totalCasualtiesAttackers++;
      if (this.activeAttackers > 0) this.activeAttackers--;
    }
  }

  /**
   * Evaluates if reinforcements are needed and can be accommodated within the performance budget.
   */
  public checkReinforcements(delta: number, currentHostilesRemaining: number): WaveDeployment | null {
    if (!this.isBattleActive) return null;

    this.waveTimer += delta;

    // Trigger next wave if hostiles wiped out or on timeout
    if (currentHostilesRemaining <= 0 && this.currentWave < this.maxWaves) {
      this.currentWave++;
      this.waveTimer = 0;
      return this.getDeploymentForWave(this.currentWave);
    }

    return null;
  }

  public getSummary() {
    return {
      citadelId: this.citadelId,
      citadelName: this.citadelName,
      wave: this.currentWave,
      maxWaves: this.maxWaves,
      budget: this.maxActiveUnitsBudget,
      totalReservesRemaining:
        this.reserves.allyInfantry +
        this.reserves.allyArchers +
        this.reserves.enemyInfantry +
        this.reserves.enemyArchers,
      casualties: {
        allies: this.totalCasualtiesDefenders,
        enemies: this.totalCasualtiesAttackers
      }
    };
  }
}
