EPSILON=1e-7
SCREENSIZE = 128
SCREEN_WIDTH = 128
SCREEN_HEIGHT = 128
SCREEN_MAX_X = SCREEN_WIDTH - 1
SCREEN_MAX_Y = SCREEN_HEIGHT - 1
SCREEN_MIN_X = 0
SCREEN_MIN_Y = 0
# cap paint rate since sending too many draw events will cause buffer lag
MAX_FRAMERATE = 30.0
# sprite animations need to run slower than max framerate, so that
# we can be sure that not so many frames are dropped as to cause
# the animation to be too difficult to understand visually
MAX_ANIMATION_FRAMERATE = 15.0
MIN_PAINT_TIME = 1.0/MAX_FRAMERATE
MIN_SIM_TIME = 1.0/300.0        # to keep from hogging CPU
MAX_SIM_TIME = 1.0/14.0     # no tunneling to keep simulation stable
MAX_SIM_STEPS = 2