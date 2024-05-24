import { tiny } from "./examples/common.js";

const { vec3, Vector3, Mat4 } = tiny;

const zero3 = vec3(0, 0, 0);

class Physics {
    /**
     * 
     * @param {number} m mass
     * @param {Vector3} x0 initial position
     * @param {Vector3} v0 initial velocity
     * @param {Vector3} f0 initial forces
     * @param {Mat4} r0 initial rotation
     * @param {Vector3} w0 initial angular velocity
     * @param {Vector3} t0 initial torques
     */
    constructor(m, x0, v0, f0, r0, w0, t0) {
        this.m = m;
        this.x = x0;
        this.v = v0;
        this.f = f0;
        this.r = r0;
        this.w = w0;
        this.t = t0;
    }

    /**
     * 
     * @param {number} dt 
     */
    update(dt) {
        this.x = this.x.plus(this.v.times(dt));
        this.v = this.v.plus(this.f.times(dt / this.m));

        const w_norm = this.w.norm();
        if (w_norm > 0) {
            this.r = this.r.times(Mat4.rotation(w_norm * dt, ...this.w));
            this.w = this.w.plus(this.t.times(dt / this.m));
        }
    }

    get_transform() {
        return Mat4.translation(...this.x).times(this.r);
    }
}

// Numbers from https://blackhawkheavylift.com/black-hawk-fleet
// Empty weight: 5000 kg
// Max takeoff weight: 10000 kg
// 2 * 1622 hp = 2.4 * 10^6 W

export class HelicopterPhysics extends Physics {
    constructor() {
        super(5e3, zero3, zero3, zero3, Mat4.identity(), zero3, zero3);

        this.engine_power = 0;
    }

    prop_on() {
        this.engine_power = 2.4e6;
    }

    prop_off() {
        this.engine_power = 0;
    }

    rotate_left() {
        this.w = vec3(0, 0.5, 0);
    }

    rotate_right() {
        this.w = vec3(0, -0.5, 0);
    }

    stop_rotate() {
        this.w = zero3;
    }

    update(dt) {
        const gravity = vec3(0, -10 * this.m, 0);
        const vy = Math.max(Math.abs(this.v[1]), 1);
        const F_ENGINE_MAX = 1e5;
        const f_engine = Math.min(this.engine_power / vy, F_ENGINE_MAX);
        const f_lift = vec3(0, f_engine, 0);
        this.f = gravity.plus(f_lift);
        super.update(dt);
    }
}
