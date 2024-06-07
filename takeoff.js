import { defs, tiny } from "./examples/common.js";
import { HelicopterPhysics } from "./physics.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
import { heli } from "./helicopter.js";

import { getRandomNumber } from './helper.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

let death = false;

export const die = () => {
    death = true;
    const b = document.getElementById("boom");
    b.currentTime = 0;
    b.play();
}

export const hashfn = (x, y) => Math.floor(x / 20) * 100 + Math.floor(y / 20);

export class Takeoff extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();
        this.offset = 0;
        this.engine = false;
        this.reset = false;

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 40),

            //our shapes
            helicopter: new heli.Helicopter(),
            main_rotor: new heli.Rotor(),
            ground: new defs.Square(),
            building: new defs.Cube(),
            helicopter_body: new Shape_From_File("assets/heli_body.obj"),
            window: new Shape_From_File("assets/window.obj"),
            fuel: new defs.Cube(),
            triangle: new defs.Triangle(),
        };

        this.scratchpad = document.createElement('canvas');
        // A hidden canvas for re-sizing the real canvas to be square:
        this.scratchpad_context = this.scratchpad.getContext('2d');
        this.scratchpad.width = 256;
        this.scratchpad.height = 256;                // Initial image source: Blank gif file:
        this.texture = new Texture("data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");

        const bump = new defs.Fake_Bump_Map(1);
        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                { ambient: .8, diffusivity: .6, color: hex_color("#808080") }),
            test2: new Material(new Gouraud_Shader(),
                { ambient: .4, diffusivity: .6, color: hex_color("#992828") }),
            ring: new Material(new Ring_Shader()),

            //our materials
            rotor: new Material(new defs.Phong_Shader(),
                { ambient: .8, specularity: .7, diffusivity: .5, color: hex_color("#111111") }),
            building: new Material(bump,
                { ambient: .6, specularity: 0, texture: new Texture("/assets/building.png") }),
            building2: new Material(bump,
                { ambient: .6, specularity: 0, texture: new Texture("/assets/building.jpg") }),
            building3: new Material(bump,
                { ambient: .6, specularity: 0, texture: new Texture("/assets/building2.jpg") }),
            helicopter: new Material(new defs.Phong_Shader(),
                { ambient: .75, specularity: 1, diffusivity: .6, color: hex_color("#b51d09") }),
            ground: new Material(new defs.Textured_Phong(), {
                color: hex_color("#000000"), ambient: 1.0, texture: new Texture("assets/floor.jpeg", "NEAREST")}),
            sky: new Material(new defs.Phong_Shader(),
                { ambient: .9, diffusivity: .5, specularity: 0, color: hex_color("#87CEEB") }),
            window: new Material(new defs.Phong_Shader(),
                { ambient: .1, diffusivity: .1, specularity: .9, color: hex_color("#91b8db") }),
            fuel: new Material(bump,
                { ambient: .6, specularity: 0, texture: new Texture("/assets/fuel.png") }),
            sun: new Material(bump, 
                { ambient: 1, diffusivity: 1, specularity: 1, texture: new Texture("/assets/sun.png")}),
            gauge: new Material(bump,
                { ambient: 0.9, specularity: 0, texture: new Texture("/assets/guage.png")}),
            shard: new Material(new defs.Phong_Shader(), { ambient: 1, diffusivity: 1, specularity: 1, color: hex_color("#ff0000") }),
        }

        this.initial_camera_location = Mat4.look_at(vec3(0.5, 0, 50), vec3(0, 0, 0), vec3(0, 1, 0));

        this.buildings_model_transform = Array();
        this.buildings_coordinates = [];
        this.building_scale = [];
        this.building_map = {};

        this.refuel_station = new Set();
        this.refuel_station.add(1830);

        for (let i = 0; i < 200; i++) {
            let index = getRandomNumber(3600, 0, true);
            while (this.refuel_station.has(index)) {
                index = getRandomNumber(3600, 0, true);
            }
            this.refuel_station.add(index);
        }

        for (let i = -60; i < 61; i++) {
            for (let j = -60; j < 61; j++) {
                if (i % 4 == 0 || j % 4 == 0 || (i + 1) % 4 == 0 || (j+1) % 4 == 0 ) continue;
                let coord = [i * 8, j * 8];
                let scale = [3, 10 * getRandomNumber(3, 1), 3];
                this.buildings_coordinates.push(coord);
                this.building_scale.push(scale);

                const hash = hashfn(...coord);

                if (hash in this.building_map) {
                    this.building_map[hash].push(this.building_scale.length - 1);
                } else {
                    this.building_map[hash] = [this.building_scale.length - 1];
                }

                let building_model_transform = Mat4.identity();
                building_model_transform = building_model_transform
                    .times(Mat4.translation(coord[0], 0, coord[1]))
                    .times(Mat4.scale(scale[0], scale[1], scale[2]));
                this.buildings_model_transform.push(building_model_transform);
            }
        }

        this.helicopter_physics = new HelicopterPhysics({
            map: this.building_map,
            scale: this.building_scale,
            coords: this.buildings_coordinates,
            refuel: this.refuel_station,
        });

        this.buildings_material = Array.from({ length: 3600 }, () => getRandomNumber(3, 0, true));

        document.addEventListener("keydown", e => {
            switch (e.key) {
                case "k":
                    this.helicopter_physics.prop_on();
                    break;
                case "j":
                    this.helicopter_physics.rotate_left();
                    break;
                case "l":
                    this.helicopter_physics.rotate_right();
                    break;
                case "w":
                    this.helicopter_physics.tilt_fb = -20;
                    break;
                case "s":
                    this.helicopter_physics.tilt_fb = 20;
                    break;
                case "a":
                    this.helicopter_physics.tilt_lr = 20;
                    break;
                case "d":
                    this.helicopter_physics.tilt_lr = -20;
                    break;
            }
        });

        document.addEventListener("keyup", e => {
            switch (e.key) {
                case "k":
                    this.helicopter_physics.prop_off();
                    break;
                case "j":
                case "l":
                    this.helicopter_physics.stop_rotate();
                    break;
                case "w":
                case "s":
                    this.helicopter_physics.tilt_fb = 0;
                    break;
                case "a":
                case "d":
                    this.helicopter_physics.tilt_lr = 0;
                    break;
            }
        });
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("SPIN", ["k"], () => { });
        this.key_triggered_button("FORWARD", ["w"], () => { });
        this.new_line();
        this.key_triggered_button("ROLL LEFT", ["a"], () => { });
        this.key_triggered_button("BACK", ["s"], () => { });
        this.key_triggered_button("ROLL RIGHT", ["d"], () => { });
        this.new_line();
        this.key_triggered_button("ROTATE LEFT", ["j"], () => { });
        this.key_triggered_button("ROTATE RIGHT", ["l"], () => { });
    }

    draw_env(context, program_state, model_transform) {
        // loop start form the left bottom corner of the ground and create a loop.

        // for now have one large intersection in the middle, two smaller streets x and y

        // so we have multiple square lots, fill them with buildings all of the same size for now

        //look into mapping an image onto the shapes for the materials

        const building_materials = [this.materials.building, this.materials.building2, this.materials.building3];
        for (let i = 0; i < 3600; i++) {
            this.shapes.building.draw(context, program_state, this.buildings_model_transform[i], building_materials[this.buildings_material[i]]);
        }


        let ground_model_transform = model_transform;
        let sky_model_transform = model_transform;
        let sun_model_transform = model_transform;
        this.shapes.ground.draw(context, program_state, ground_model_transform.times(Mat4.scale(400, 400, 400)).times(Mat4.rotation(Math.PI/2, 1, 0, 0)), this.materials.ground);

        this.shapes.sphere.draw(context, program_state, sky_model_transform.times(Mat4.scale(200, 200, 200)).times(Mat4.rotation(Math.PI / 2, 1, 0, 0)), this.materials.sky);
        this.shapes.sphere.draw(context, program_state, sun_model_transform.times(Mat4.translation(0, 55, -160)).times(Mat4.scale(10, 10, 10)), this.materials.sun);

        //REFUEL STATION START
        this.refuel_station.forEach((index, value, set) => {
            const coord = this.buildings_coordinates[index];
            const scale  = this.building_scale[index];
            let translation =[
                ...coord.slice(0, 1),
                scale[1] + 2,
                ...coord.slice(1)
            ];
            let fuel_model_transform = model_transform;
            this.shapes.fuel.draw(context, program_state, fuel_model_transform.times(Mat4.translation(translation[0], translation[1], translation[2])).times(Mat4.scale(2, 2, 2)), this.materials.fuel)
        });
        //REFUEL STATION END
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Camera_Info());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 100000);

        // TODO: Lighting (Requirement 2)
        const sun_position = vec4(0, 55, -160, 1);
        const light_position = vec4(0, 100, 0, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 10000), new Light(sun_position, color(1, 1, 1, 1), 10000000)];


        let dt = program_state.animation_delta_time / 1000;

        if (death) {

            dt /= 60;

            const heli_tf = this.helicopter_physics.get_transform();



            if (!this?.shards) {
                this.shards = [];

                for (let i = 0; i < 2000; i++) {

                    const dx = Math.random() * 20 - 10;
                    const dy = Math.random() * 20 - 10;
                    const dz = Math.random() * 20 - 10;

                    this.shards.push(vec3(dx, dy, dz));

                    const mat = this.materials.shard.override({color: color(1, Math.random(), 0, 1)})

                    this.shapes.triangle.draw(context, program_state, heli_tf.times(Mat4.translation(dx, dy, dz)), mat);
                }
            } else {
                for (let shard_dist of this.shards) {
                    shard_dist.scale_by(shard_dist.norm() / 5);
                    const mat = this.materials.shard.override({color: color(1, Math.random(), 0, 1)})
                    this.shapes.triangle.draw(context, program_state, heli_tf.times(Mat4.translation(...shard_dist)), mat);
                }
            }

            setTimeout(() => {
                death = false;
                this.helicopter_physics.x = vec3(0, 2, 0);
                this.shards = null;
            }, 600);
        }

        if (!death)
            this.helicopter_physics.update(dt);

        const heli_transform = this.helicopter_physics.get_transform();

        const wobble = death ? Math.sin(program_state.animation_time / 20) : 0;

        const target_cam_mat = Mat4.look_at(
            vec3(...heli_transform.times(vec4(0, 15, 40, 1))),
            vec3(...heli_transform.times(vec4(0, wobble, 0, 1))),
            vec3(0, 1, 0));

        program_state.set_camera(target_cam_mat);

        //draw environment
        this.draw_env(context, program_state, Mat4.identity());

        const t = program_state.animation_time / 1000;

        //NOTE: HELI HAS 3 PARTS (BODY, WINDOW, ROTOR) WHICH SHOULD BE POSITIONED LIKE BELOW:

        const tilt = Mat4.rotation(this.helicopter_physics.tilt_fb * Math.PI / 180 / 2, 1, 0, 0)
            .times(Mat4.rotation(this.helicopter_physics.tilt_lr * Math.PI / 180 / 2, 0, 0, 1));
        
        let body_tf = heli_transform.times(tilt).times(Mat4.scale(3, 3, 3));
        this.shapes.helicopter_body.draw(context, program_state, body_tf, this.materials.helicopter);
        let window_tf = body_tf.times(Mat4.translation(.04, .8, -.5)) //position window relative to body
            .times(Mat4.scale(.45, .45, .45));

        this.shapes.window.draw(context, program_state, window_tf, this.materials.window);
        let rotor_tf = body_tf.times(Mat4.translation(0, 1.6, .4)) //position rotor relative to body
            .times(Mat4.rotation(this.helicopter_physics.main_rotor_power / 6e3 * t, 0, 1, 0));
        this.shapes.main_rotor.draw(context, program_state, rotor_tf, this.materials.rotor);

        //GUAGE CODE START

        let gauge_transform = heli_transform;
        gauge_transform = gauge_transform.times(Mat4.translation(-(18.5) / 1.5, 15 / 1.5 - 7.5, 40 / 1.5)).times(Mat4.scale(3.5, 3.5, 3.5)).times(Mat4.rotation(-Math.atan2(15, 40), 1, 0, 0));
        this.shapes.circle.draw(context, program_state, gauge_transform,this.materials.gauge);

        let meter = gauge_transform.times(Mat4.rotation(-0.5 * Math.PI * (1 - this.helicopter_physics.fuel / 100), 0, 0, 1));
        
        meter = meter.times(Mat4.scale(0.01, 0.8, 0.01));
        this.shapes.fuel.draw(context, program_state, meter, this.materials.test.override({color:color(0, 0, 0, 1)}));

        //GUAGE CODE END
    }
}

class Gouraud_Shader extends Shader {
    // This is a Shader using Phong_Shader as template
    // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

    constructor(num_lights = 2) {
        super();
        this.num_lights = num_lights;
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 vc;
        
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;

                // Compute an initial (ambient) color:
                vc = vec4( shape_color.xyz * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                vc.xyz += phong_model_lights( N , vertex_worldspace );
            } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            void main(){                                                           
                gl_FragColor = vc;
                return;
            } `;
    }

    send_material(gl, gpu, material) {
        // send_material(): Send the desired shape-wide material qualities to the
        // graphics card, where they will tweak the Phong lighting formula.
        gl.uniform4fv(gpu.shape_color, material.color);
        gl.uniform1f(gpu.ambient, material.ambient);
        gl.uniform1f(gpu.diffusivity, material.diffusivity);
        gl.uniform1f(gpu.specularity, material.specularity);
        gl.uniform1f(gpu.smoothness, material.smoothness);
    }

    send_gpu_state(gl, gpu, gpu_state, model_transform) {
        // send_gpu_state():  Send the state of our whole drawing context to the GPU.
        const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
        gl.uniform3fv(gpu.camera_center, camera_center);
        // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
        const squared_scale = model_transform.reduce(
            (acc, r) => {
                return acc.plus(vec4(...r).times_pairwise(r))
            }, vec4(0, 0, 0, 0)).to3();
        gl.uniform3fv(gpu.squared_scale, squared_scale);
        // Send the current matrices to the shader.  Go ahead and pre-compute
        // the products we'll need of the of the three special matrices and just
        // cache and send those.  They will be the same throughout this draw
        // call, and thus across each instance of the vertex shader.
        // Transpose them since the GPU expects matrices as column-major arrays.
        const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
        gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

        // Omitting lights will show only the material color, scaled by the ambient term:
        if (!gpu_state.lights.length)
            return;

        const light_positions_flattened = [], light_colors_flattened = [];
        for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
            light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
            light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
        }
        gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
        gl.uniform4fv(gpu.light_colors, light_colors_flattened);
        gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
        // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
        // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
        // program (which we call the "Program_State").  Send both a material and a program state to the shaders
        // within this function, one data field at a time, to fully initialize the shader for a draw.

        // Fill in any missing fields in the Material object with custom defaults for this shader:
        const defaults = { color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
        material = Object.assign({}, defaults, material);

        this.send_material(context, gpu_addresses, material);
        this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
    }
}

class Ring_Shader extends Shader {
    update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
        // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
        const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
            PCM = P.times(C).times(M);
        context.uniformMatrix4fv(gpu_addresses.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
        context.uniformMatrix4fv(gpu_addresses.projection_camera_model_transform, false,
            Matrix.flatten_2D_to_1D(PCM.transposed()));
    }

    shared_glsl_code() {
        // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
        return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
    }

    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
            center = model_transform * vec4(0, 0, 0, 1);
            point_position = model_transform * vec4(position, 1);
            gl_Position = projection_camera_model_transform * vec4(position, 1); 
        }`;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
        return this.shared_glsl_code() + `
        void main(){
            float scalar = sin(18.0 * distance(point_position.xyz, center.xyz));
            gl_FragColor = scalar * vec4(0.61, 0.375, 0.15, 1);
        }`;
    }
}

