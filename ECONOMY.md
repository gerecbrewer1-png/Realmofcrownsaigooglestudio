# Game Economy Design

## 1. Resource Balance & Production Formula

Each economic building (Farm, Lumber Mill, Quarry, Iron Mine, Gold Mine) produces resources based on level:

$$\text{ProductionPerHour}(L) = \text{BaseRate} \times (1 + (L - 1) \times 0.45)$$

For a Level 1 Farm:
- Base Rate: 1,200 Food / hour (0.333 Food / sec).
- Level 5 Farm: 3,360 Food / hour.

## 2. Construction Timing Formula

$$\text{DurationSeconds}(L) = \text{BaseTime} \times (1.85)^{L - 1}$$

- Level 1: 10 seconds (Instant/quick for onboarding tutorial).
- Level 2: 30 seconds.
- Level 3: 90 seconds.
- Level 4: 240 seconds.
- Level 5: 600 seconds.

## 3. Warehouse Protection

The Warehouse guarantees safe retention of basic resources in the event of siege raids:
- Level 1: Protects 50,000 Food, Wood, Stone; 20,000 Iron; 10,000 Gold.
- Scales up to millions at Castle Level 25.
