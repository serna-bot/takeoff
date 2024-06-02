import {tiny, defs} from "./examples/common.js";

const {
    Shape, Mat4
} = tiny;

const heli = {};

export {heli};

//our defined rotor shape
const Rotor = heli.Rotor =
    class Rotor extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");

            let blade_1 = Mat4.identity();
            blade_1 = blade_1.times(Mat4.scale(2.3, .01, .07));
            defs.Cube.insert_transformed_copy_into(this, [], blade_1);
            
            let blade_2 = Mat4.identity();
            blade_2 = blade_2.times(Mat4.rotation(Math.PI/2, 0, 1, 0));
            blade_2 = blade_2.times(Mat4.scale(2.3, .01, .07));
            defs.Cube.insert_transformed_copy_into(this, [], blade_2);
        }
    }

//our defined skid shape
const Skid = heli.Skid =
    class Skid extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");

            //skid poles
            let pole_1 = Mat4.identity().times(Mat4.translation(0, 0, -1));
            let pole_2 = Mat4.identity().times(Mat4.translation(0, 0, 1));
            pole_1 = pole_1.times(Mat4.scale(.2, 1.5, .2)).times(Mat4.rotation(Math.PI/2, 1, 0, 0));
            pole_2 = pole_2.times(Mat4.scale(.2, 1.5, .2)).times(Mat4.rotation(Math.PI/2, 1, 0, 0));
            defs.Capped_Cylinder.insert_transformed_copy_into(this, [10, 35, [[0, 1], [0, 1]]], pole_1);
            defs.Capped_Cylinder.insert_transformed_copy_into(this, [10, 35, [[0, 1], [0, 1]]], pole_2);

            //skid
            let skid_1 = Mat4.identity().times(Mat4.translation(0, -.8, 0));
            skid_1 = skid_1.times(Mat4.scale(.2, .2, 6));
            defs.Capped_Cylinder.insert_transformed_copy_into(this, [10, 35, [[0, 1], [0, 1]]], skid_1);
        }
    }

//our defined helicopter shape
const Helicopter = heli.Helicopter =
    class Helicopter extends Shape {
        constructor() {
            super("position", "normal", "texture_coord");

            let body_transform = Mat4.identity();
            body_transform = body_transform.times(Mat4.scale(1.7, 1.5, 2.5));
            defs.Cube.insert_transformed_copy_into(this, [], body_transform);

            let front = Mat4.identity().times(Mat4.translation(0, -.2, -3)); 
            front = front.times(Mat4.scale(1.4, 1, .5));
            defs.Cube.insert_transformed_copy_into(this, [], front);

            let tail_transform = Mat4.translation(0, -.5, 5.3); 
            tail_transform = tail_transform.times(Mat4.scale(0.7, 0.4, 2.8));
            defs.Cube.insert_transformed_copy_into(this, [], tail_transform);

            //to hold the rotor
            let cylinder_transform = Mat4.identity();
            cylinder_transform = Mat4.translation(0, 2, 0);
            cylinder_transform = cylinder_transform.times(Mat4.scale(.4, 1, .4));
            cylinder_transform = cylinder_transform.times(Mat4.rotation(Math.PI/2, 1, 0, 0));
            defs.Capped_Cylinder.insert_transformed_copy_into(this, [10, 35, [[0, 1], [0, 1]]], cylinder_transform);

            let stabilizer_transform = Mat4.identity();
            stabilizer_transform = stabilizer_transform.times(Mat4.translation(0, -.5, 6.8));
            stabilizer_transform = stabilizer_transform.times(Mat4.scale(1.5, .05, .3));
            defs.Cube.insert_transformed_copy_into(this, [], stabilizer_transform);

            let skid_1 = Mat4.identity().times(Mat4.translation(-1.5, -2, 0));
            skid_1 = skid_1.times(Mat4.rotation(-Math.PI/8, 0, 0, 1));
            let skid_2 = Mat4.identity().times(Mat4.translation(1.5, -2, 0));
            skid_2 = skid_2.times(Mat4.rotation(Math.PI/8, 0, 0, 1));
            Skid.insert_transformed_copy_into(this, [], skid_1);
            Skid.insert_transformed_copy_into(this, [], skid_2);
        }
    }