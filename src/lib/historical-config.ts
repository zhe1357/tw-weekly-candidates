// Frozen cumulative-return maxima from the 2026 Jan–Sep, 36-period fixed-pool comparison.
export const HISTORICAL_CONFIG = {
  "50": {
    "classification": {
      "groups": 50,
      "totalReturn": 0.7789671465607764
    },
    "regression": {
      "groups": 10,
      "totalReturn": 1.22269280173305
    },
    "intersection": {
      "groups": 10,
      "totalReturn": 0.7846448635881851
    }
  },
  "100": {
    "classification": {
      "groups": 40,
      "totalReturn": 1.3373210755483966
    },
    "regression": {
      "groups": 10,
      "totalReturn": 1.5778600446392606
    },
    "intersection": {
      "groups": 10,
      "totalReturn": 0.964195490607944
    }
  },
  "200": {
    "classification": {
      "groups": 40,
      "totalReturn": 1.0426405116013102
    },
    "regression": {
      "groups": 50,
      "totalReturn": 1.1373968523229991
    },
    "intersection": {
      "groups": 10,
      "totalReturn": 1.1263176689324488
    }
  },
  "500": {
    "classification": {
      "groups": 50,
      "totalReturn": 0.728634093256914
    },
    "regression": {
      "groups": 50,
      "totalReturn": 1.4206682175962086
    },
    "intersection": {
      "groups": 50,
      "totalReturn": 2.5240742162169747
    }
  },
  "1000": {
    "classification": {
      "groups": 40,
      "totalReturn": 0.4785516919966184
    },
    "regression": {
      "groups": 50,
      "totalReturn": 1.1906123699594007
    },
    "intersection": {
      "groups": 50,
      "totalReturn": 1.5853424077808138
    }
  }
} as const;
