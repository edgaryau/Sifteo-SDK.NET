//
// This class is part of the Flocker demo app. See
// [FlockerApp.cs](flockerapp.html).
//

// ------------------------------------------------------------------------

using System;
using System.Collections.Generic;
using Sifteo;
using Sifteo.MathExt;


namespace Flocker {


  // The FlockerWrapper class encapsulates the simulation of a collection of
  // FlockerShape class game objects for a Cube.
  class FlockerWrapper {

    // These are constants that tune the behavior of the game. Try changing some values.
    internal const int NumStartingShapes = 4;
    internal const float RadiusMinShape = 3f;
    internal const float RadiusMaxShape = 5f;
    internal const float RadiusMinUnscaledShape = 0.65f;
    internal const float RadiusMaxUnscaledShape = 1.35f;
    internal const float VelocityMax = 60f;
    internal const float AccelSeparate = 48f;
    internal const float AccelCohere = 24f;
    internal const float AccelAlign = 1.4f;
    internal const float AccelTilt = 90f;
    internal const float AccelBounce = -1.5f;
    internal const float AccelCenter = 360f;
    internal const float DistanceMaxFlockAttract = 48f;
    internal const float DistanceMaxFlockSeparate = 12f;

    internal static readonly Color BackgroundColor = new Color(36, 182, 255);
    internal static readonly Color BorderColor = new Color(255, 145, 0);
    internal static readonly Color ShapeColor = new Color(255, 255, 255);

    private List<FlockerShape> mShapes = new List<FlockerShape>();  

    internal Cube mCube { get; private set; }

    // Here we initialize the wrapper by associating it with a cube and seeding it with some shapes.
    internal FlockerWrapper(Cube cube) {
      this.mCube = cube;
      for (int i = 0; i < FlockerWrapper.NumStartingShapes; ++i) {
        AddShape(new FlockerShape(this));
      }
    }

    internal void OnLostCube() { mShapes.Clear(); }

    internal void AddShape(FlockerShape s) {
      s.TransferToCube(this.mCube);
      mShapes.Add(s);
    }

    // Here we simulate each game object for the time that has passed.
    internal void Tick(float dt) {
      foreach (FlockerShape s in mShapes) {
        s.Tick(dt, mShapes);
      }

      // Transfer shapes from one cube to another, if they are on the border.
      // See FlockerShape for details about Cube.Neighbors.
      List<FlockerShape> toRemove = new List<FlockerShape>();
      foreach (FlockerShape s in mShapes) {
        List<Cube.Side> boundarySides = CalcBoundarySides(s.Position, s.Radius);
        foreach (Cube.Side side in boundarySides) {
          Cube neighbor = this.mCube.Neighbors[side];
          if (neighbor != null && neighbor.userData != null) {
            FlockerWrapper fw = (FlockerWrapper)neighbor.userData;
            fw.AddShape(s);

            // It's usually a bad idea to remove items from a collection while
            // iterating over it, so let's wait until this loop is done.
            toRemove.Add(s);

            // We only need to remove the shape once, so break out of the inner
            // loop when removing a shape.
            break;
          }
        }
      }
      foreach (FlockerShape s in toRemove) {
        mShapes.Remove(s);
      }
    }

    // Here we paint this wrapper's shapes to the cube.
    internal void Paint() {
      this.mCube.FillScreen(BackgroundColor);

      // Paint borders when a cube is neighbored to this one.
      for (Cube.Side side = Cube.Side.TOP; side <= Cube.Side.RIGHT; ++side) {
        Cube neighbor = this.mCube.Neighbors[side];
        if (neighbor != null && neighbor.userData != null) {
          const int BorderSize = 4;
          switch (side) {
            case Cube.Side.TOP:
              this.mCube.FillRect(BorderColor, 0, 0, Cube.SCREEN_WIDTH, BorderSize);
              break;
            case Cube.Side.LEFT:
              this.mCube.FillRect(BorderColor, 0, 0, BorderSize, Cube.SCREEN_HEIGHT);
              break;
            case Cube.Side.BOTTOM:
              this.mCube.FillRect(BorderColor, 0, Cube.SCREEN_HEIGHT - BorderSize, Cube.SCREEN_WIDTH, BorderSize);
              break;
            case Cube.Side.RIGHT:
              this.mCube.FillRect(BorderColor, Cube.SCREEN_WIDTH - BorderSize, 0, BorderSize, Cube.SCREEN_HEIGHT);
              break;
          }
        }
      }

      // Paint each shape.
      foreach (FlockerShape s in mShapes) {
        s.Paint(this.mCube);
      }

      this.mCube.Paint();
    }

    // This method returns a list of the Cube.Sides that the argument circle is
    // on the wrong side of, and thus is considered "out of bounds."
    static internal List<Cube.Side> CalcBoundarySides(Float2 center, float radius) {
      List<Cube.Side> sides = new List<Cube.Side>();
      if (Mathf.Round(center.x - radius) < 0f) {
        sides.Add(Cube.Side.LEFT);
      }
      else if (Mathf.Round(center.x + radius) > Cube.SCREEN_MAX_X) {
        sides.Add(Cube.Side.RIGHT);
      }
      if (Mathf.Round(center.y - radius) < 0f) {
        sides.Add(Cube.Side.TOP);
      }
      else if (Mathf.Round(center.y + radius) > Cube.SCREEN_MAX_Y) {
        sides.Add(Cube.Side.BOTTOM);
      }
      return sides;
    }
  }
}

// -----------------------------------------------------------------------
//
// FlockerWrapper.cs
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

