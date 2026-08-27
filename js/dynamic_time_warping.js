/**
 * @file dynamic_time_warping.js
 * @brief Dynamic Time Warping (DTW) Multi-Dimensional Time Series Matcher
 *
 * Referenced from STEMSmartLabs/plushpal-twa framework
 */

class DynamicTimeWarping {
  constructor(ts1, ts2, distanceFunction) {
    this.ser1 = ts1;
    this.ser2 = ts2;
    this.distFunc = distanceFunction || this.euclideanDistance;
    this.matrix = null;
    this.distance = undefined;
  }

  euclideanDistance(p1, p2) {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  getDistance() {
    if (this.distance !== undefined) {
      return this.distance;
    }

    const n = this.ser1.length;
    const m = this.ser2.length;
    if (n === 0 || m === 0) return Infinity;

    this.matrix = [];
    for (let i = 0; i < n; i++) {
      this.matrix[i] = [];
      for (let j = 0; j < m; j++) {
        let cost = Infinity;
        if (i > 0) {
          cost = Math.min(cost, this.matrix[i - 1][j]);
          if (j > 0) {
            cost = Math.min(cost, this.matrix[i - 1][j - 1]);
            cost = Math.min(cost, this.matrix[i][j - 1]);
          }
        } else {
          if (j > 0) {
            cost = Math.min(cost, this.matrix[i][j - 1]);
          }
        }

        if (i === 0 && j === 0) {
          cost = 0;
        }

        this.matrix[i][j] = cost + this.distFunc(this.ser1[i], this.ser2[j]);
      }
    }

    // Normalized distance by average path length
    this.distance = this.matrix[n - 1][m - 1] / Math.max(n, m);
    return this.distance;
  }
}

window.DynamicTimeWarping = DynamicTimeWarping;
