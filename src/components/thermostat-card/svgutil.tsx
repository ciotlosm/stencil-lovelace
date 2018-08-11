export class SvgUtil {
    static createSVGElement(tag, attributes) {
      const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
      this.attributes(element, attributes)
      return element;
    }
    static attributes(element, attrs) {
      for (let i in attrs) {
        element.setAttribute(i, attrs[i]);
      }
    }
    // Rotate a cartesian point about given origin by X degrees
    static rotatePoint(point, angle, origin) {
      const radians = angle * Math.PI / 180;
      const x = point[0] - origin[0];
      const y = point[1] - origin[1];
      const x1 = x * Math.cos(radians) - y * Math.sin(radians) + origin[0];
      const y1 = x * Math.sin(radians) + y * Math.cos(radians) + origin[1];
      return [x1, y1];
    }
    // Rotate an array of cartesian points about a given origin by X degrees
    static rotatePoints(points, angle, origin) {
      return points.map((point) => this.rotatePoint(point, angle, origin));
    }
    // Given an array of points, return an SVG path string representing the shape they define
    static pointsToPath(points) {
      return points.map((point, iPoint) => (iPoint > 0 ? 'L' : 'M') + point[0] + ' ' + point[1]).join(' ') + 'Z';
    }
    static circleToPath(cx, cy, r) {
      return [
        "M", cx, ",", cy,
        "m", 0 - r, ",", 0,
        "a", r, ",", r, 0, 1, ",", 0, r * 2, ",", 0,
        "a", r, ",", r, 0, 1, ",", 0, 0 - r * 2, ",", 0,
        "z"
      ].join(' ').replace(/\s,\s/g, ",");
    }
    static donutPath(cx, cy, rOuter, rInner) {
      return this.circleToPath(cx, cy, rOuter) + " " + this.circleToPath(cx, cy, rInner);
    }
  
    static superscript(number) {
      return `${Math.floor(number)}${number % 1 != 0 ? '⁵' : ''}`;
    }

    static scalePath(pathArray, scale) {
      return pathArray.map((x: number) => isNaN(x) ? x : x * scale).join(' ');
    }
  
    // Restrict a number to a min + max range
    static restrictToRange(val, min, max) {
      if (val < min) return min;
      if (val > max) return max;
      return val;
    }
    static setClass(el, className, state) {
      el.classList[state ? 'add' : 'remove'](className);
    }
  
    static anglesToSectors(radius, startAngle, angle) {
      let aRad = 0 // Angle in Rad
      let z = 0 // Size z
      let x = 0 // Side x
      let X = 0 // SVG X coordinate
      let Y = 0 // SVG Y coordinate
      const aCalc = (angle > 180) ? 360 - angle : angle;
      aRad = aCalc * Math.PI / 180;
      z = Math.sqrt(2 * radius * radius - (2 * radius * radius * Math.cos(aRad)));
      if (aCalc <= 90) {
        x = radius * Math.sin(aRad);
      }
      else {
        x = radius * Math.sin((180 - aCalc) * Math.PI / 180);
      }
      Y = Math.sqrt(z * z - x * x);
      if (angle <= 180) {
        X = radius + x;
      }
      else {
        X = radius - x;
      }
      return {
        L: radius,
        X: X,
        Y: Y,
        R: startAngle
      }
    }
  }