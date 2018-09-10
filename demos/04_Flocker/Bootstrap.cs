/*
 *
 * Bootstrap.cs
 *
 * Copyright (c) 2011 Sifteo Inc.
 *
 * This program is "Sample Code" as defined in the Sifteo
 * Software Development Kit License Agreement. By adapting
 * or linking to this program, you agree to the terms of the
 * License Agreement.
 *
 * If this program was distributed without the full License
 * Agreement, a copy can be obtained by contacting
 * support@sifteo.com.
 *
 */
using Sifteo;

namespace Flocker {

  // The Bootstrap class provides a way to execute the Sifteo game using a
  // debugger.
  public class Bootstrap {

    public static void Main(string[] args) {

      (new FlockerApp()).Run();
    }
  }
}
