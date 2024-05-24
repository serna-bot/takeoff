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
        }
        this.w = this.w.plus(this.t.times(dt / this.m));
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

        this.engine_power = 2.4e6;
        this.f_lift_max = 1e5;
        this.f_rot_max = 1e4;
        this.air_res = 40;

        this.main_rotor_power = 0;
        this.tail_rotor_power = 0;
    }

    prop_on() {
        this.main_rotor_power = this.engine_power;
    }

    prop_off() {
        this.main_rotor_power = 0;
    }

    rotate_left() {
        this.tail_rotor_power = 0.1 * this.engine_power;
    }

    rotate_right() {
        this.tail_rotor_power = -0.1 * this.engine_power;
    }

    stop_rotate() {
        this.tail_rotor_power = 0;
    }

    update(dt) {
        const f_g = -10 * this.m;

        const vy = this.v[1];
        const f_lift = Math.min(this.main_rotor_power / Math.abs(vy), this.f_lift_max) || 0;
        const f_drag = -Math.sign(vy) * this.air_res * vy * vy;

        const wy = this.w[1];
        console.log(wy);
        const f_rot = Math.max(Math.min(this.tail_rotor_power / Math.abs(wy), this.f_rot_max), -this.f_rot_max) || 0;
        const f_rot_drag = -Math.sign(wy) * 240 * this.air_res * wy * wy;

        this.f = vec3(0, f_g + f_lift + f_drag, 0);
        this.t = vec3(0, f_rot + f_rot_drag, 0);

        super.update(dt);
    }
}
