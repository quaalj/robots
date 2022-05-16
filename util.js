/// Utility Functions

String.prototype.count=function(c) { 
	let result = 0;
	for (let i = 0; i < this.length; i++) {
		if (this[i]==c) {
			result++;
		}
	}
	return result;
};

export class Mulberry32 {
	constructor(a) {
		this.seed = a;
	}
	
	randRaw() {
		this.seed += 0x6D2B79F5;
		let t = this.seed;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0);
	}

	randFloat() {
		return this.randRaw() / 4294967296;
	}
	
	randInt(lo, hi) {
		return Math.floor(this.randFloat() * (hi - lo)) + lo;
	}

	randPoint(loX, hiX, loY, hiY) {
		return new Point(this.randInt(loX, hiX), this.randInt(loY, hiY));
	}
}

export function arrayFind(arr, value) {
	for (let i = 0; i < arr.length; ++i) {
		if (arr[i] == value) {
			return i;
		}
		if (typeof value === 'object' && value != null) {
			if ('equals' in arr[i] && value.equals(arr[i])) {
				return i;
			}
		}
	}
	return -1;
}

export function arrayRemove(arr, value) {
	let found = arrayFind(arr, value);
	if (found >= 0) {
		arr.splice(found, 1);
	}
}

export function arrayContains(arr, value) {
	return arrayFind(arr, value) >= 0;
}

export function isAnyOf(value, ...targets) {
	return arrayContains(targets, value);
}

export function intcmp(x, y) {
	return x - y;
}

export function isHexDigit(x) {
	return x.length == 1 && (/[A-Fa-f\d]/).test(x);
}

export function strcmp ( str1, str2 ) {
	// http://kevin.vanzonneveld.net
	// +   original by: Waldo Malqui Silva
	// +      input by: Steve Hilder
	// +   improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// +    revised by: gorthaur
	// *     example 1: strcmp( 'waldo', 'owald' );
	// *     returns 1: 1
	// *     example 2: strcmp( 'owald', 'waldo' );
	// *     returns 2: -1

	return ( ( str1 == str2 ) ? 0 : ( ( str1 > str2 ) ? 1 : -1 ) );
}

// https://www.w3resource.com/javascript-exercises/javascript-array-exercise-17.php
export function shuffle(arra1, randSeed = 0) {
	let ctr = arra1.length, temp, index;
	let rand = new Mulberry32(randSeed);

	// While there are elements in the array
	while (ctr > 0) {
		// Pick a random index
		index = Math.floor(rand.randFloat() * ctr);
		// Decrease ctr by 1
		ctr--;
		// And swap the last element with it
		temp = arra1[ctr];
		arra1[ctr] = arra1[index];
		arra1[index] = temp;
	}
	return arra1;
}

export function intdiv(x, y) {
	return ~~(x / y);
}

export function isupper(c) {
	return c == c.toUpperCase();
}

export function makeEnum(values, functions = {}) {
	let dict = functions;
	let allValues = [];
	
	for (let i = 0; i < values.length; ++i) {
		dict[values[i]] = i;
		allValues.push(i);
	}
	
	dict["str"] = function(val) {
		if (val >= 0 && val < values.length) {
			return values[val]; 
		}
		return "None";
	};
	
	dict["allValues"] = allValues;
	
	return Object.freeze(dict);
}

export const Direction = makeEnum(['Left', 'Up', 'Right', 'Down'], {
	inverse: function(direction) {
		if (direction == Direction.Left) {
			return Direction.Right;
		} else if (direction == Direction.Right) {
			return Direction.Left;
		} else if (direction == Direction.Up) {
			return Direction.Down;
		} else if (direction == Direction.Down) {
			return Direction.Up;
		} else {
			return -1;
		}
	},
	rotate90: function(direction, amount) {
		while (amount < 0) {
			amount += 4;
		}
		return (direction + amount) % 4;
	},
	bumperSlant(direction, slant) {
		if (slant) {
			if (direction == Direction.Up) {
				return Direction.Right;
			}
			if (direction == Direction.Left) {
				return Direction.Down;
			}
			if (direction == Direction.Right) {
				return Direction.Up;
			}
			if (direction == Direction.Down) {
				return Direction.Left;
			}
		} else {
			if (direction == Direction.Up) {
				return Direction.Left;
			}
			if (direction == Direction.Right) {
				return Direction.Down;
			}
			if (direction == Direction.Left) {
				return Direction.Up;
			}
			if (direction == Direction.Down) {
				return Direction.Right;
			}
		}
		return null;
	}
});

export class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	
	static fromDirection(direction) {
		if (direction >= 0 && direction <= 4) {
			return Point.CardinalPoints[direction];
		} else {
			return new Point(0, 0);
		}
	}
	
	sub(...args) {
		if (args.length == 2) {
			return new Point(this.x - args[0], this.y - args[1]);
		} else {
			return this.sub(args[0].x, args[0].y);
		}
	}
	
	add(...args) {
		if (args.length == 2) {
			return new Point(this.x + args[0], this.y + args[1]);
		} else {
			return this.add(args[0].x, args[0].y);
		}
	}
	
	mul(a) {
		return new Point(this.x * a, this.y * a);
	}
	
	abs() {
		return new Point(Math.abs(this.x), Math.abs(this.y));
	}
	
	l1Norm() {
		return Math.abs(this.x) + Math.abs(this.y);
	}
	
	l1Dist(other) {
		return (this.sub(other)).l1Norm();
	}
	
	lInfNorm() {
		return Math.max(Math.abs(this.x), Math.abs(this.y));
	}
	
	lInfDist(other) {
		return (this.sub(other)).lInfNorm();
	}
	
	getDirection() {
		if (this.x == 0) {
			if (this.y > 0) {
				return Direction.Down;
			} else if (this.y < 0) {
				return Direction.Up;
			}
		} else if (this.y == 0) {
			if (this.x > 0) {
				return Direction.Right;
			} else if (this.x < 0) {
				return Direction.Left;
			}
		}
		return null;
	}
	
	rotate90(size, iterations = 1) {
		while (iterations < 0) {
			iterations += 4;
		}
		if (iterations == 0) {
			return new Point(this.x, this.y);
		} else {
			let newPoint = new Point(size.y - this.y - 1, this.x);
			if (iterations == 1) {
				return newPoint;
			} else {
				return newPoint.rotate90(new Point(size.y, size.x), iterations - 1);
			}
		}
	}
	
	equals(other) {
		if (other == null) {
			return false;
		}
		return this.x == other.x && this.y == other.y;
	}
	
	toString() {
		return `(${this.x},${this.y})`;
	}
}

Point.CardinalPoints = [new Point(-1, 0), new Point(0, -1), new Point(1, 0), new Point(0, 1)];
