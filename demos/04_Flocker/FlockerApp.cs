//
// This app presents a simple demo in which a flock of dots fly around and
// across your cubes. Different gestures influence the dots in different ways:
//
// * Neighbor: allow dots to fly between cubes.
// * Press: pull dots towards the center of a cube.
// * Tilt: push the dots in the direction of the tilt.
// * Shake: push the dots towards the edges of the cube.
// * Flip: stop movement.
//
// The other classes for this app are in separate files. See
// [FlockerWrapper.cs](flockerwrapper.html) and
// [FlockerShape.cs](flockershape.html).
//

// ------------------------------------------------------------------------

using Sifteo;


namespace Flocker {

  class FlockerApp : BaseApp {

    // Here we initialize our app.
    public override void Setup() {
      this.PauseEvent += OnPause;
      this.UnpauseEvent += OnUnpause;
      this.CubeSet.NewCubeEvent += OnNewCube;
      this.CubeSet.LostCubeEvent += OnLostCube;
      foreach (Cube c in CubeSet) {
        OnNewCube(c);
      }
    }

    // ### BaseApp.FrameRate ###
    // You can manually set your game's frame rate by overriding the FrameRate
    // property.  The rate you set it to will depend on the amount of work
    // (drawing, logic, etc.) you want to do every frame.
    public override int FrameRate { get { return 18; } }

    // For each cube that is being simulated, tick the simulation, and then
    // paint.
    public override void Tick() {
      foreach (Cube c in CubeSet) {
        if (c.userData != null) {
          FlockerWrapper fw = (FlockerWrapper)c.userData;

          // ### BaseApp.DeltaTime ###
          // DeltaTime is the elapsed time (in seconds) since the last tick. It
          // is used to correctly calculate changes in physics or animation.
          // The value is usually 1.0/FrameRate, but it can be longer if there
          // are delays due to draw calls, radio communication, etc. 
          fw.Tick(this.DeltaTime);
          fw.Paint();
        }
      }
    }

    // Paint the pause screen on each Cube, so that users know the game is
    // paused, and not frozen.
    private void OnPause() {
      foreach (Cube c in this.CubeSet) {
        c.Image("paused");
        c.Paint();
      }
    }

    // For each Cube that is being simulated, paint over the pause screen
    // image, now that the game is no longer paused.
    private void OnUnpause() {
      foreach (Cube c in this.CubeSet) {
        if (c.userData != null) {
          FlockerWrapper fw = (FlockerWrapper)c.userData;
          fw.Paint();
        }
      }
    }

    // When a Cube is added to the CubeSet, if the new Cube hasn't been
    // initialized with a FlockerWrapper, create one.
    private void OnNewCube(Cube c) {
      if (c.userData == null) {
        c.userData = new FlockerWrapper(c);
      }
    }

    // When a Cube is lost from the CubeSet, notify the FlockerWrapper for that
    // Cube.
    private void OnLostCube(Cube c) {
      if (c.userData != null) {
        FlockerWrapper fw = (FlockerWrapper)c.userData;
        fw.OnLostCube();
      }
    }
  }
}

// -----------------------------------------------------------------------
//
// FlockerApp.cs
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

