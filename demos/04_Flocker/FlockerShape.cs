//
// This class is part of the Flocker demo app. See
// [FlockerApp.cs](flockerapp.html).
//

// ------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using Sifteo;

// The Sifteo.MathExt assembly contains utility functions that aren't provided
// in the standard libraries.
using Sifteo.MathExt;


namespace Flocker {


  // The FlockerShape class represents a game object that can paint, move and scale.
  internal class FlockerShape {

    private Cube mCube;
    private float mRadius;
    private Float2 mPosition;
    private Float2 mVelocity;
    private Float2[] mVertices;
    internal Float2 Position { get { return mPosition; } }
    internal float Radius { get { return mRadius; } }

    internal static readonly Float2 center = new Float2(Cube.SCREEN_WIDTH / 2f, Cube.SCREEN_HEIGHT / 2f);

    internal FlockerShape(FlockerWrapper fw) {
      mCube = fw.mCube;

      // Randomize the starting radius to an integer in [RadiusMinShape,
      // RadiusMaxShape]. The radius integer is stored as a float, to
      // interoperate more cleanly with floats used in the movement/scale
      // simulation.
      mRadius = FlockerWrapper.RadiusMinShape;
      mRadius +=
       (float)Mathf.DiceRoll((int)FlockerWrapper.RadiusMaxShape - (int)FlockerWrapper.RadiusMinShape + 1);

      // Pick a random starting position.
      float x = Mathf.RandomRange(mRadius, Cube.SCREEN_MAX_X - mRadius);
      float y = Mathf.RandomRange(mRadius, Cube.SCREEN_MAX_Y - mRadius);
      mPosition = new Float2(x, y);

      // Create two vertices (points that define a geometric shape) for the
      // minimum and maximum points of the rectangle this FlockerShape paints.
      mVertices = new Float2[2];

      // Center the vertices on (0, 0), so we can just add the position to
      // determine their current position on the cube's screen. Centering the
      // vertices on (0, 0) also makes it easy to later make the shape appear
      // smaller or larger, since we can just multiply by a number.
      const float MinRadius = FlockerWrapper.RadiusMinUnscaledShape;
      const float MaxRadius = FlockerWrapper.RadiusMaxUnscaledShape;
      switch (mVertices.Length) {
        case 2:
          mVertices[0].x = -Mathf.RandomRange(MinRadius, MaxRadius);
          mVertices[0].y = -Mathf.RandomRange(MinRadius, MaxRadius);
          mVertices[1].x = Mathf.RandomRange(MinRadius, MaxRadius);
          mVertices[1].y = Mathf.RandomRange(MinRadius, MaxRadius);
          break;
      }
    }

    // Simulate this shape for the dt time passed.
    internal void Tick(float dt, List<FlockerShape> shapes) {

      // Resize by -1 or +1, randomly, to create a nice pulsing effect.
      mRadius += (Mathf.DiceRoll(3) - 1) / 2f;
      mRadius =
        Mathf.Clamp(mRadius, FlockerWrapper.RadiusMinShape, FlockerWrapper.RadiusMaxShape);

      // Build an acceleration vector, used to update velocity of this shape.
      // We'll add in an acceleration for one influence in each step below.
      Float2 a = new Float2();

      // Add acceleration for "flocking". This will make the Shapes move like a
      // flock of birds. More info: <http://www.red3d.com/cwr/boids/>
      int attractorCount = 0;
      Float2 attractorPositions = new Float2();
      Float2 attractorVelocities = new Float2();

      // Iterate over all the local shapes and calculate this shape's behavior
      // relative to them.
      foreach (FlockerShape s in shapes) {

        // Calculate the distance to the other shape.
        Float2 positionDelta = this.Position - s.Position;
        float dist = positionDelta.Magnitude;

        // If the other shape is in range, it will attract this shape. To help
        // implement this attraction, record each other attractor Shape's
        // position, and later find the average.
        if (dist > 0f &&
            dist <= FlockerWrapper.DistanceMaxFlockAttract) {
          attractorPositions += s.Position;
          attractorVelocities += s.mVelocity;
          ++attractorCount;
        }

        // If the other shape is too close, add an acceleration to this shape
        // to move it away. Normalize the difference in position, then scale by
        // the separation weight to create a separating acceleration, and add it
        // to the acceleration vector.
        if (dist > 0f && dist <= FlockerWrapper.DistanceMaxFlockSeparate) {
          a += positionDelta * (FlockerWrapper.AccelSeparate / dist);
        }
      }

      // Now, accelerate toward the average position of attracting shapes.
      if (attractorCount > 0) {
        attractorPositions /= attractorCount;
        Float2 toAttractors = attractorPositions - this.Position;
        float distToAttractors = toAttractors.Magnitude;
        if (distToAttractors > 0f) {
          // Normalize direction to attractors, scale by attraction weight, and
          // add to acceleration.
          a += toAttractors * (FlockerWrapper.AccelCohere / distToAttractors);
        }

        // Accelerate to align velocity with average velocity of attractors.
        a += attractorVelocities * (FlockerWrapper.AccelAlign / attractorCount);
      }

      // ### Cube.Tilt ###
      // You can query the Tilt property of a cube at any time without using
      // event handlers. The value is an array of three ints, representing the
      // tilt on the X, Y, or Z axis. See
      // [SlideShowApp](slideshowapp.html) for details about
      // interpreting tilt values.

      // Here we add acceleration in the direction of the current tilt.
      Float2 dirTilt = new Float2(mCube.Tilt[Cube.TILT_X] - 1, -(mCube.Tilt[Cube.TILT_Y] - 1));
      if (!dirTilt.Equals(Float2.Zero)) {
        a += dirTilt * FlockerWrapper.AccelTilt;
      }

      // ### Cube.ButtonIsPressed ###
      // You can query the ButtonIsPressed property of a cube at any time
      // without using event handlers. ButtonIsPressed is true if the button is
      // being held down.

      // Here we pull the shapes towards the center of the cube if the button
      // is pressed.
      if (mCube.ButtonIsPressed) {
        Float2 centerDelta = FlockerShape.center - this.Position;
        float distanceToCenter = centerDelta.Magnitude;
        if (distanceToCenter > 0f) {
          a += centerDelta * (FlockerWrapper.AccelCenter / distanceToCenter);
        }
      }

      // ### Cube.IsShaking ###
      // You can query the IsShaking property of a cube at any time without
      // using event handlers.

      // Here we push the shapes out towards the edge of the cube if the cube
      // is being shaken.
      if (mCube.IsShaking) {
        Float2 centerDelta = this.Position - FlockerShape.center;
        float distanceToCenter = centerDelta.Magnitude;
        if (distanceToCenter > 0f) {
          a += centerDelta * (FlockerWrapper.AccelCenter / distanceToCenter);
        }
      }

      // ### Cube.IsUpright ###
      // The IsUpright property of a cube is true if the cube is face up; that
      // is, if its tilt on the Z-axis is 2.

      // Here we cancel out all acceleration and velocity if the cube is face
      // down, bringing the shape to a complete stop.
      if (!mCube.IsUpright) {
        a = new Float2();
        mVelocity = new Float2();
      }

      // Apply the acceleration to velocity. Limit the velocity to a fixed
      // maximum, so that Shapes don't accelerate to undesirable speeds.
      mVelocity += a * dt;
      float speed = mVelocity.Magnitude;
      if (speed < -FlockerWrapper.VelocityMax || speed > FlockerWrapper.VelocityMax) {
        float clampedSpeed =
          Mathf.Clamp(speed, -FlockerWrapper.VelocityMax, FlockerWrapper.VelocityMax);
        mVelocity *= clampedSpeed / speed;
      }

      // Apply velocity to position.
      Float2 newPosition = this.Position + mVelocity * dt;

      if (!newPosition.Equals(this.Position)) {

        List<Cube.Side> boundarySides =
          FlockerWrapper.CalcBoundarySides(newPosition, mRadius);

        // Iterate over the cube's sides; check if a shape's new position would
        // put it off the screen, and not onto a neighbor cube on that side.
        Float2 velocityMult = new Float2(1f, 1f);
        foreach (Cube.Side side in boundarySides) {

          // ### Cube.Neighbors ###
          // You can query the Neighbors property of a cube at any time.
          // The Neighbors object can be accessed like an array, but it has a
          // number of other properties and methods for working with a cube's
          // neigbhors.

          // Here we check for a neighboring cube on each side. If there isn't
          // a neighbor, we bounce the shape off the walls of the screen.
          if (mCube.Neighbors[side] == null) {
            if (side == Cube.Side.LEFT || side == Cube.Side.RIGHT) {
              velocityMult.x = FlockerWrapper.AccelBounce;
              newPosition.x = Mathf.Clamp(newPosition.x, mRadius, Cube.SCREEN_MAX_X - mRadius);
            }
            else {
              velocityMult.y = FlockerWrapper.AccelBounce;
              newPosition.y = Mathf.Clamp(newPosition.y, mRadius, Cube.SCREEN_MAX_Y - mRadius);
            }
          }
        }

        mPosition = newPosition;
        mVelocity.x *= velocityMult.x;
        mVelocity.y *= velocityMult.y;
      }
    }

    // Paint this shape on its cube.
    internal void Paint(Cube c) {

      if (FlockerWrapper.CalcBoundarySides(this.Position, mRadius).Count > 0) {
        return;
      }

      // Vertices and position are stored as floating point values, to allow
      // for fractional movement during simulation.
      Int2[] vertices = new Int2[mVertices.Length];
      for (int i = 0; i < vertices.Length; ++i) {
        // Move the verts to be offset from mPosition, and scale by mRadius.
        vertices[i].x = (int)Mathf.Round(mVertices[i].x * mRadius + mPosition.x);
        vertices[i].y = (int)Mathf.Round(mVertices[i].y * mRadius + mPosition.y);
      }

      switch (mVertices.Length) {
        case 2:
          // If there are two vertices, they are the minimum and maximum
          // positions of a rectangle.
          c.FillRect(
            FlockerWrapper.ShapeColor,
            vertices[0].x,
            vertices[0].y,
            vertices[1].x - vertices[0].x,
            vertices[1].y - vertices[0].y);
          break;
      }
    }

    internal void TransferToCube(Cube c) {
      if (mCube == c) {
        return;
      }

      // When transfering from a neighbor cube, transform the position and
      // velocity appropriately.
      if (mCube != null) {
        TransformToNeighborSpace(
          ref mVelocity,
          ref mPosition,
          mCube.Neighbors.SideOf(c),
          c.Neighbors.SideOf(mCube));
      }

      mCube = c;
    }

    // This method transfers a position and velocity from one cube's coordinate
    // space to another's, based on the neighbored sides. It returns the
    // transformed position and velocity as reference arguments.
    internal static void TransformToNeighborSpace(ref Float2 velocity,
                                                  ref Float2 position,
                                                  Cube.Side fromSide,
                                                  Cube.Side toSide) {
      // This function builds a transformation, step-by-step, from scratch.
      // Alternatively, you can create a lookup table with all the possible
      // transformations, but that technique can be error prone, especially if
      // you decide to alter it later.

      // First, determine the angle, in radians, that the origin cube is
      // rotated from the neighbor cube.
      int sideDelta = fromSide - toSide;
      float radians;
      if (Math.Abs(sideDelta) == 2) {
        radians = 0f;
      }
      else if (sideDelta == 0) {
        radians = Mathf.Pi;
      }
      else if (sideDelta == -1 || sideDelta == 3) {
        radians = Mathf.Pi / 2f;
      }
      else {
        radians = -Mathf.Pi / 2f;
      }

      // Next, if the neighbor cube is rotated relative to the origin cube,
      // rotate the input vectors about the center of the origin cube, so that
      // they appear the same on the neighbor cube.
      if (radians != 0f) {

        // Temporarily make the positions relative to the center, so that we
        // can rotate them about it.
        position -= FlockerShape.center;

        // Rotate about the center of the screen.
        Matrix rotation = Matrix.Rotation(radians);
        position = rotation.TransformPoint(position);
        // The velocity is just a direction, so it can be rotated without
        // making it relative to the center.
        velocity = rotation.TransformDirection(velocity);

        // Now make the position relative to (0, 0) again.
        position += FlockerShape.center;
      }

      // Next, move the rotated positions toward the side of the neighbor cube
      // that touches the origin cube.
      Float2 deltaPosition = Float2.Side(toSide);
      if (toSide == Cube.Side.LEFT || toSide == Cube.Side.RIGHT) {
        deltaPosition *= Cube.SCREEN_WIDTH;
      }
      else {
        deltaPosition *= Cube.SCREEN_HEIGHT;
      }
      position += deltaPosition;
    }
  }
}

// -----------------------------------------------------------------------
//
// FlockerShape.cs
//
// Copyright &copy; 2011 Sifteo Inc.
//
// This program is "Sample Code" as defined in the Sifteo
// Software Development Kit License Agreement. By adapting
// or linking to this program, you agree to the terms of the
// License Agreement.
//
// If this program was distributed without the full License
// Agreement, a copy can be obtained by contacting
// support@sifteo.com.
//

