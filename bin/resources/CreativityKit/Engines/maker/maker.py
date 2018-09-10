import sift.base_app
import sift.siftable
import sift.util
import os
import types
import warnings
import maker_painter
import maker_font_verdana_bold_18
import maker_states
from maker_constants import *
from maker_siftablewrapper import *

VERBOSE = False


class GameState:
    SPLASH          = "SPLASH"          # title screen that appears when game is started
    LOAD            = "LOAD"            # load the puzzle files
    PLAY            = "PLAY"            # playing the game
    ROUND_ACCURACY = "ROUND_ACCURACY"   # round stats, after finishing a round
    ROUND_COUNTDOWN = "ROUND_COUNTDOWN" # round stats, after finishing a round
    ROUND_ELAPSED   = "ROUND_ELAPSED"   # round stats, after finishing a round
    ROUND_EXPLORE   = "ROUND_EXPLORE"   # round stats, after finishing a round
    SCORE_ACCURACY = "SCORE_ACCURACY"   # play session stats, after finishing a play session
    SCORE_COUNTDOWN = "SCORE_COUNTDOWN" # play session stats, after finishing a play session
    SCORE_ELAPSED   = "SCORE_ELAPSED"   # play session stats, after finishing a play session
    SCORE_EXPLORE   = "SCORE_EXPLORE"   # play session stats, after finishing a play session
    FILE_ERROR      = "FILE_ERROR"      # display errors from reading file
    
    
class MakerApp(sift.base_app.BaseApp):
    """ 
    Main entry point into this game app, which plays user-generated 
    puzzles. Users edit the puzzles in an external text or spreadsheet 
    editor of their choice (not made by Sifteo). Or, maybe a GUI
    some day.
    """
    
    def setup(self):
        self.wrappers = {}
        self.siftables.on("new_siftable", self.on_new_siftable)
        for s in self.siftables:
            self.wrappers[s.id] = SiftableWrapper(s, self)
        self.siftables.remove_event_handler("new_siftable", self.on_new_siftable)
#        print "%d siftables wrapped" % len(self.wrappers.values())
        self.rescued_wrappers = []
        self.prev_time = 0
        self.sim_time = 0
        self.prev_paint_time = 0       
        self._font = maker_font_verdana_bold_18.FONT 
        self.on("pause", self.on_pause)
        self.on("unpause", self.on_unpause)
        # state machine, to implement modes of play
        self._game_state_machine = sift.util.StateMachine()
        self._game_state_machine.add_states( {
                                                                 # self, next state
            GameState.SPLASH            : maker_states.StateSplash(self, GameState.LOAD),
            GameState.LOAD              : maker_states.StateLoad(self, GameState.PLAY),
            GameState.PLAY              : maker_states.StatePlay(self, GameState.SCORE_ELAPSED),
            GameState.ROUND_ACCURACY    : maker_states.StateRoundAccuracy(self, GameState.PLAY),
            GameState.ROUND_COUNTDOWN   : maker_states.StateRoundCountdown(self, GameState.PLAY),
            GameState.ROUND_ELAPSED     : maker_states.StateRoundElapsed(self, GameState.PLAY),
            GameState.ROUND_EXPLORE     : maker_states.StateRoundExplore(self, GameState.PLAY),
            GameState.SCORE_ACCURACY    : maker_states.StateScoreAccuracy(self, GameState.PLAY),
            GameState.SCORE_COUNTDOWN   : maker_states.StateScoreCountdown(self, GameState.PLAY),
            GameState.SCORE_ELAPSED     : maker_states.StateScoreElapsed(self, GameState.PLAY),
            GameState.SCORE_EXPLORE     : maker_states.StateScoreExplore(self, GameState.PLAY),
            GameState.FILE_ERROR        : maker_states.StateFileError(self, GameState.PLAY),
        })
        # TODO allow skipping to PLAY state for debugging (currently messes up puzzle) 
        self._game_state_machine.goto(GameState.SPLASH)
                
    def on_new_siftable(self, event):
        print event
        # if this siftable is already wrapped, nothing to do
#        print event 
#        print event["siftable"].id 
#        print self.wrappers.keys()
#        print "-----------------"
        w = None
        if len(self.rescued_wrappers) > 0:
            w = self.rescued_wrappers.pop()
            w.siftable = event["siftable"]
            w.id = w.siftable.id
            self.wrappers[w.id] = w
        else:
            w = self._init_siftable(event["siftable"])
#            if w.need_reset:
#                w.reset()
        if w:
            w._needs_paint = True
#            w._force_repaint = True

    def on_lost_siftable(self, event):
        print event
        wrapper = self.find_wrapper(event["siftable"])
        if wrapper:
            print "saving wrapper to rescued wrappers"
            self.rescued_wrappers.append(wrapper)
            del self.wrappers[wrapper.id]
            wrapper.siftable.clear_event_handlers()
            wrapper.siftable = None

    def _init_siftable(self, s):
        wrapper = self.find_wrapper(s)
        if not wrapper:
            wrapper = SiftableWrapper(s, self)
            self.wrappers[s.id] = wrapper
        return wrapper

    def find_wrapper(self, siftable):
        out = None
        if siftable:
            if self.wrappers.has_key(siftable.id):
                out = self.wrappers[siftable.id]
        return out

    def tick(self, dt):
        # BounceApp    
#        if self.prev_time == 0:
#            print "First app tick"            
        self.sim_time += dt
        # simulate, if enough time has passed
        sim_dt = self.sim_time - self.prev_time
        simulate = (sim_dt >= MIN_SIM_TIME)
        sim_steps = 0
        if simulate:
#            print "tick %f sim %d" % (self.sim_time - self.prev_time, simulate)
            # update simulation for each block
            # TODO revert to simple frame rate capping code
            while sim_dt >= MIN_SIM_TIME and sim_steps < MAX_SIM_STEPS:
                self.dt = sift.util.math_ext.clamp(sim_dt, MIN_SIM_TIME, 99999.0)#MAX_SIM_TIME)
                sim_dt -= self.dt
                sim_steps += 1
                self._game_state_machine.tick()
#            print "sim steps %d" % sim_steps
        # painting
#            self.audio.tick()
        paint = (self.sim_time - self.prev_paint_time >= MIN_PAINT_TIME)
        if paint:
            if self._game_state_machine.current != None:
#                print "first paint %s" %([w.first_paint for w in self.wrappers.values()]) 
                self._game_state_machine.current.paint()
#                print "   %s" % [s.draw_count for s in self.siftables]
                for s in self.siftables:
                    if s.draw_count > 0:
                        s.repaint()
#                        print "------ repaint %d force? %d" % (w.siftable.id, w._force_repaint)
#            if True and DEBUG:
#                paint_dt = self.sim_time - self.prev_paint_time
#                if not is_near_zero(paint_dt):
#                    ball_wrapper = None
#                    for w in self.wrappers.values():
#                        if len(w.get_balls()) > 0:
#                            ball_wrapper = w
#                    draw_count = ball_wrapper_draw_count
#                    if draw_count > 0:
#                        time_per_draw = paint_dt/draw_count
#                    else:
#                        time_per_draw = -1
#                    print "paint fps %.2f draw count %d ratio %.6f" % (1.0/paint_dt, draw_count, time_per_draw)
#                else:
#                    print "paint dt near zero!"
            self.prev_paint_time = self.sim_time
        # finish simulating
        if simulate:        
            self.prev_time = self.sim_time# - sim_dt
        # update SoundManager independently, since it doesn't really
        # simulate anything
#        self.sound_manager.tick()

    def on_pause(self, event):
        for s in self.siftables:
            s.image("ui_menu_bg")
            self._font.paint(s, 
                             8, 
                             8, 
                             "Game Paused", 
                             area=(112, 112), 
                             alignment=(sift.util.font.ALIGNMENT_CENTER, 
                                        sift.util.font.ALIGNMENT_MIDDLE), 
                             wrap=True)
        self.play_sound("pause.mp3")
        self.siftables.repaint()

    def on_unpause(self, event):
        for w in self.wrappers.values():
            w._needs_paint = True
        self._game_state_machine.current._needs_paint = True
        self._game_state_machine.current.paint()
        self.play_sound("unpause.mp3")
        self.siftables.repaint()
        
    def play_sound(self, filename, loop=False):
        # BounceApp                
#        self.sound_manager.play(filename)
		if loop:
			self.sounds.start(filename, True)
		else:
			self.sounds.play(filename)
#            print "playing sound %s" % filename        

    def stop_sound(self, filename):
        # BounceApp                
#        self.sound_manager.play(filename)
        self.sounds.stop(filename)
#            print "playing sound %s" % filename        

    def set_game_data(self, stats_dict):
        print stats_dict
        self._game_data = stats_dict
    
    def get_game_data(self):
        return self._game_data