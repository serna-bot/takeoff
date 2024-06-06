import { tiny } from "./examples/common.js";
import { die, hashfn } from "./takeoff.js";

const { vec3, vec4, Vector3, Mat4 } = tiny;

const zero3 = vec3(0, 0, 0);

/*

    p1 + v1 * t = p2 + v2 * s

    [v1, -v2][t; s] = p2 - p1

    [1, -v21 / v11; 1, -v22 / v12][t; s] = [(p21 - p11) / v11; (p22 - p12) / v12]

    [1, -v21 / v11; 0, v21 / v11 - v22 / v12][t; s] = [(p21 - p11) / v11; (p22 - p12) / v12 - (p21 - p11) / v11]

    [1, -v21 / v11; 0, 1][t; s] = [(p21 - p11) / v11;
                                    ((p22 - p12) / v12 - (p21 - p11) / v11) / (v21 / v11 - v22 / v12)]

    [1, 0; 0, 1][t; s] = [(p21 - p11) / v11 + v21 / v11 * (((p22 - p12) / v12 - (p21 - p11) / v11) / (v21 / v11 - v22 / v12));
                          ((p22 - p12) / v12 - (p21 - p11) / v11) / (v21 / v11 - v22 / v12)]
*/



const intersect = (ls1, ls2) => {
    const [p1, v1] = ls1;
    const [p2, v2] = ls2;

    if (p1.minus(p2).norm() == 0)
        return true;

    let [v11, _a, v12] = v1;
    let [v21, _b, v22] = v2;
    let [e1, _c, e2] = p2.minus(p1);

    let [a, b, c, d, e, f] = [v11, -v21, e1, v12, -v22, e2];

    if (a == 0 && d == 0) {
        return false;
    } else if (a == 0) {
        [a, b, c, d, e, f] = [d, e, f, a, b, c];
    }

    b /= a;
    c /= a;

    e -= b * d;
    f -= c * d;

    if (e == 0)
        return f == 0;

    f /= e;

    c -= b * f;

    return (0 <= f && f <= 1) && (0 <= c && c <= 1);
};

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

    /**
     * 
     * @returns {Mat4}
     */
    get_transform() {
        return Mat4.translation(...this.x).times(this.r);
    }
}

// Numbers from https://blackhawkheavylift.com/black-hawk-fleet
// Empty weight: 5000 kg
// Max takeoff weight: 10000 kg
// 2 * 1622 hp = 2.4 * 10^6 W

const sound = document.getElementById("sound");

export class HelicopterPhysics extends Physics {
    constructor(buildings) {
        super(5e3, zero3, zero3, zero3, Mat4.identity(), zero3, zero3);

        this.engine_power = 2.4e6;
        this.f_lift_max = 1e5;
        this.f_rot_max = 1e4;
        this.air_res = 1200;

        this.main_rotor_power = 0;
        this.tail_rotor_power = 0;

        this.tilt_lr = 0;
        this.tilt_fb = 0;
        this.buildings = buildings;
        this.fuel = 100;
    }

    prop_on() {
        this.main_rotor_power = this.engine_power;
        sound.play();
    }

    prop_off() {
        this.main_rotor_power = 0;
        sound.pause();
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

    refuel(sound) {
        if (this.fuel < 100) {
            this.fuel = 100;

            if (sound) {
                const b = document.getElementById("fuel");
                b.currentTime = 0;
                b.play();
            }
        }
    }

    update(dt) {
        if (this.fuel <= 0) {
            this.main_rotor_power = 0;
            this.tail_rotor_power = 0;
        }

        const f_g = vec3(0, -10 * this.m, 0);

        const tilt = Mat4.rotation(this.tilt_fb * Math.PI / 180, 1, 0, 0)
            .times(Mat4.rotation(this.tilt_lr * Math.PI / 180, 0, 0, 1));

        const vy = Math.abs(this.v[1]);

        const lift_mag = Math.min(this.main_rotor_power / vy, this.f_lift_max) || 0;
        const f_lift = this.r.times(tilt).times(vec3(0, lift_mag, 0));

        const f_drag = this.v.times(-this.air_res * this.v.norm());

        const wy = this.w[1];
        const f_rot = Math.max(Math.min(this.tail_rotor_power / Math.abs(wy), this.f_rot_max), -this.f_rot_max) || 0;

        const f_rot_drag = -Math.sign(wy) * 20 * this.air_res * wy * wy;

        this.f = f_g.plus(f_lift).plus(f_drag);
        this.t = vec3(0, f_rot + f_rot_drag, 0);

        if (this.x[1] > 2 && lift_mag > 0) this.fuel -= (this.x[1] - 2) * 0.03 * dt;
        
        super.update(dt);

        if (this.x[1] < 2) {
            this.x[1] = 2;
            this.v[1] = Math.max(this.v[1], 0)
            this.v[0] /= 4;
            this.v[2] /= 4;
            this.w.scale_by(0.25);
        }

        const hash = hashfn(this.x[0], this.x[2]);
        const nearby_buildings = this.buildings.map[hash];

        const tf = this.get_transform();

        const tr = tf.times(vec4(3, 0, 3, 1));
        const bl = tf.times(vec4(-3, 0, -3, 1));
        const br = tf.times(vec4(3, 0, -3, 1));
        const tl = tf.times(vec4(-3, 0, 3, 1));

        tr[1] = bl[1] = br[1] = tl[1] = 0;
        const heli_edges = [
            [bl, br.minus(bl)],
            [bl, tl.minus(bl)],
            [tr, br.minus(tr)],
            [tr, tl.minus(tr)]
        ];

        nearby_buildings?.flatMap(i => {
            const coord = this.buildings.coords[i];
            const scale = this.buildings.scale[i];

            const xmin = coord[0] - 3;
            const xmax = coord[0] + 3;
            const zmin = coord[1] - 3;
            const zmax = coord[1] + 3;

            return [
                [[vec4(xmin, 0, zmin, 1), vec4(6, 0, 0, 0)], scale[1], i],
                [[vec4(xmin, 0, zmin, 1), vec4(0, 0, 6, 0)], scale[1], i],
                [[vec4(xmax, 0, zmax, 1), vec4(0, 0, -6, 0)], scale[1], i],
                [[vec4(xmax, 0, zmax, 1), vec4(-6, 0, 0, 0)], scale[1], i],
            ];
        }).forEach(([eb, bh, i]) => {
            for (const eh of heli_edges) {
                if (intersect(eb, eh)) {
                    if (this.x[1] < bh + 2) {
                        if (this.x[1] >= bh + 1) {
                            this.x[1] = bh + 2;
                            this.v[1] = Math.max(0, this.v[1]);
                            this.v[0] /= 4;
                            this.v[2] /= 4;

                            this.w.scale_by(0.25);

                            if (this.buildings.refuel.has(i)) {
                                this.refuel(true);
                            }
                        } else {
                            die();
                            this.refuel(false);
                        }
                    }
                }
            }
        });
    }
}
