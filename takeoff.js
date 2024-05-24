import {defs, tiny} from "./examples/common.js";
import { HelicopterPhysics } from "./physics.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Texture, Material, Scene,
} = tiny;

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
            circle: new defs.Regular_2D_Polygon(1, 15),

            //our shapes
            helicopter: new defs.Helicopter(),
            main_rotor: new defs.Rotor(),
            ground: new defs.Square(),
            building: new defs.Cube()

        };

        this.shapes.building.arrays.texture_coord.forEach(p => p.scale_by(2));

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
                {ambient: .8, diffusivity: .6, color: hex_color("#808080")}),
            test2: new Material(new Gouraud_Shader(),
                {ambient: .4, diffusivity: .6, color: hex_color("#992828")}),
            ring: new Material(new Ring_Shader()),

            //our materials
            rotor: new Material(new defs.Phong_Shader(),
                {ambient: .8, diffusivity: .6, color: hex_color("#3A3B3C")}),
            building: new Material(bump,
                {ambient: .5, texture: new Texture("/assets/building.png")})
        }

        this.initial_camera_location = Mat4.look_at(vec3(0.5, 0, 50), vec3(0, 0, 0), vec3(0, 1, 0));

        this.helicopter_physics = new HelicopterPhysics();

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
                    this.helicopter_physics.tilt_fb = -15;
                    break;
                case "s":
                    this.helicopter_physics.tilt_fb = 15;
                    break;
                case "a":
                    this.helicopter_physics.tilt_lr = 15;
                    break;
                case "d":
                    this.helicopter_physics.tilt_lr = -15;
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
        this.key_triggered_button("TAKEOFF!", ["Control", "0"], () => {
            this.engine = true;
            this.reset = true;
            });
        this.new_line();
        this.key_triggered_button("STOP!", ["Control", "1"], () => {
            this.engine = false;
            });
    }

    draw_env(context, program_state, model_transform) {
        

        // loop start form the left bottom corner of the ground and create a loop.

        // for now have one large intersection in the middle, two smaller streets x and y

        // so we have multiple square lots, fill them with buildings all of the same size for now

        //look into mapping an image onto the shapes for the materials

        for (let i = -20; i < 21; i++) {
            for (let j = -20; j < 21; j++) {
                if (i % 4 == 0 || j % 4 == 0 || (i + 1) % 4 == 0 || (j+1) % 4 == 0 ) continue;
                let building_model_transform = model_transform;
                building_model_transform = building_model_transform
                    .times(Mat4.translation(i * 5, 0, j * 5))
                    .times(Mat4.scale(2, 10, 2));
                this.shapes.building.draw(context, program_state, building_model_transform, this.materials.building);
            }
        }


        let ground_model_transform = model_transform;
        this.shapes.ground.draw(context, program_state, ground_model_transform.times(Mat4.translation(0, -10, 0)).times(Mat4.scale(100, 100, 100)).times(Mat4.rotation(Math.PI/2, 1, 0, 0)), this.materials.test);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 100000);

        // TODO: Lighting (Requirement 2)
        const light_position = vec4(0, 100, 0, -10);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000000)];

        const dt = program_state.animation_delta_time / 1000;

        this.helicopter_physics.update(dt);

        const body_transform = this.helicopter_physics.get_transform();

        //draw our helicopter
        this.draw_env(context, program_state, Mat4.identity());
        
        let model_transform = body_transform;
        this.shapes.helicopter.draw(context, program_state, model_transform, this.materials.test);
        //reset time for when rotor starts
        if (this.reset) {
            this.offset = program_state.animation_time;
            this.reset = false;
        }
        const t = (program_state.animation_time - this.offset) / 1000;
        //draw our rotor
        const speed = 25 / (1 + Math.exp(-.5 * (t - 5))); //logistic growth
        let rotor_transform = body_transform;
        rotor_transform = rotor_transform.times(Mat4.rotation(this.helicopter_physics.main_rotor_power / 1e5 * t, 0, 1, 0));
        rotor_transform = rotor_transform.times(Mat4.translation(0, 2.2, 0));
        this.shapes.main_rotor.draw(context, program_state, rotor_transform, this.materials.rotor);
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
        const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
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

