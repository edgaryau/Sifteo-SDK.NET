import sift.base_app
import sift.siftable
import sift.util
import sift.util.spriteAnimator
import csv
import os
import types
import warnings
import maker_painter
import maker_font_verdana_bold_18
from maker_constants import *
from maker_siftablewrapper import *

DEBUG = True

MENU_STATE_IDLE = 0
MENU_STATE_NEIGHBORED = 1
MENU_STATE_CONFIRMED = 2


class StateSelectorMenu(object):
    """ Neighboring menu, implements state interface for statemachine """
    
    def __init__(self, app):
        self._app = app
        self.siftables = self._app.siftables
        # default values to be overridden in setup() or setup_opts().
        # constants
        self._font = maker_font_verdana_bold_18.FONT
        self.pulse_delay = 0.167
        self.neighbor_delay = 0#0.167
        self.confirm_delay = 0
        self.arrow_position = 0.5
        self.selector_bg = "ui_menu_bg"
        self.opt_bg = "ui_menu_bg"
        self.extra_bg = "ui_menu_bg"
        self.confirm_sound = "menu_confirm.mp3"
        self.error_sound = "menu_invalid.mp3"
        num_frames = 4
        self._selector_arrow_anim = sift.util.spriteAnimator.SpriteAnimator(images=["ui_arrow"], 
                                                                 numFrames=num_frames,
                                                                 frameWidth=24, 
                                                                 frameHeight=24, 
                                                                 numRows=num_frames, 
                                                                 numCols=1, 
                                                                 framerate=MAX_ANIMATION_FRAMERATE/4.0, # HACK why is this animation running 4x? 
                                                                 startingFrame = 0, 
                                                                 looping = True, 
                                                                 frameCallback = self._selector_arrow_anim_cb)
        self._selector_arrow_anim.start()
        self._reset()

    def setup(self):
        self._reset()
        for s in self.siftables:
            self.add_siftable(s)
        self.siftables.on("new_siftable", self.on_new_siftable)
        self.siftables.on("lost_siftable", self.on_lost_siftable)
        self.siftables.add_event_handler("neighbor_change", self.on_neighbor_change)
    
    def _reset(self):
        self.sift_selector = None
        self.sift_opt1 = None
        self.sift_opt2 = None
        self.setup_opts()
        self.state = MENU_STATE_IDLE
        self.chosen_option = None
        self.confirm_time = -1
        self.neighbor_time = -1
        self.reset_pulse()
        self._needs_paint = True
        
    def setup_opts(self):
        self.selector_text = "foo bar baz qux gak ble"
        self.selector_sides = [0]
        self.selector_bg = "XXX"
        self.opt_bg = "XXX"
        self.opts = (
            {
                "title":"FOO",
                "opts":[
                    { "name":"foo", "value":"post_menu_test", "label":"lfoo", "full_title":"foo oof", },
                    { "name":"bar", "value":"post_menu_test", "label":"lbar", "full_title":"bar rab", },
                    { "name":"baz", "value":"post_menu_test", "label":"lbaz", "full_title":"baz zab", },
                    ],
            },
            {
                "title":"QUX",
                "opts":[
                    { "name":"qux", "value":"post_menu_test", "label":"lqux", "full_title":"qux xuq", },
                    { "name":"gak", "value":"post_menu_test", "label":"lgak", "full_title":"gak kag", },
                    { "name":"ble", "value":"post_menu_test", "label":"lble", "full_title":"ble elb", },
                    ],
            },
        )

    def cleanup_event_handlers(self):
        self.siftables.remove_event_handler("new_siftable", self.on_new_siftable)
        self.siftables.remove_event_handler("lost_siftable", self.on_lost_siftable)
        self.siftables.remove_event_handler("neighbor_change", self.on_neighbor_change)
        for s in self.siftables:
            s.remove_event_handler("flip_screendown", self.on_flip_screendown)

    def cleanup(self):
        self.cleanup_event_handlers()
#        self._app.audio.stop_all()
        for s in self.siftables:
            s.orientation = 0

    def tick(self):
        if self.state == MENU_STATE_CONFIRMED and self._app.sim_time - self.confirm_time > self.confirm_delay:
            return self.chosen_option["value"]
        if self.state == MENU_STATE_NEIGHBORED and self._app.sim_time - self.neighbor_time > self.neighbor_delay:
            self.check_neighbor()
            self.neighbor_time = -1
#        print "tick selector menu %.3f" % self._app.sim_time
        self._selector_arrow_anim.update(self._app.dt)

    def paint(self):
        if self.state == MENU_STATE_IDLE:
            if self._app.sim_time - self.pulse_time > self.pulse_delay and self.sift_selector:
                self.pulse_time = self._app.sim_time
                self.paint_selector_arrows(self.sift_selector)
        if self._needs_paint:
#            print "painting menu"
            self._needs_paint = False
            self.paint_all()

    def add_siftable(self, siftable):
        if not self.sift_selector:
            self.sift_selector = siftable
        elif not self.sift_opt1:
            self.sift_opt1 = siftable
        elif not self.sift_opt2:
            self.sift_opt2 = siftable
        self._needs_paint = True
        siftable.on("flip_screendown", self.on_flip_screendown)

    def on_flip_screendown(self, event):
        pass

    def on_new_siftable(self, event):
        self.add_siftable(event["siftable"])
        self._app.on_new_siftable(event)
    
    def remove_siftable(self, siftable):
        if siftable == self.sift_selector:
            self.sift_selector = None
        if siftable == self.sift_opt1:
            self.sift_opt1 = None
        if siftable == self.sift_opt2:
            self.sift_opt2 = None
        self.paint_all()

    def on_lost_siftable(self, event):
        self.remove_siftable(event["siftable"])
        self._app.on_lost_siftable(event)

    def enough_sifts(self):
        return (self.sift_selector is not None and self.sift_opt1 is not None and self.sift_opt2 is not None)

    def on_neighbor_change(self, event):
#        if DEBUG:
#            if event["type"] == "add":
#                print "MENU NEIGHBOR Add"
        if not self.enough_sifts():
            return
        if self.state == MENU_STATE_CONFIRMED:
            return
        # are these the blocks we care about?
        if self.sift_selector not in (event["siftable1"], event["siftable2"]):
            if event["type"] == "add":
                self._app.play_sound(self.error_sound)
            return
        sift_nei = event["siftable2"]
        side_nei = event["side2"]
        side_sel = event["side1"]
        if self.sift_selector == event["siftable2"]:
            sift_nei = event["siftable1"]
            side_nei = event["side1"]
            side_sel = event["side2"]
        if sift_nei not in (self.sift_opt1, self.sift_opt2):
            if event["type"] == "add":
                self._app.play_sound(self.error_sound)
            return
        if event["type"] == "remove" and side_sel in self.selector_sides and self.state == MENU_STATE_NEIGHBORED:
            self.state = MENU_STATE_IDLE
            self.neighbor_time = -1
            self.reset_pulse()
            self.paint_arrows(event["siftable1"])
            self.paint_arrows(event["siftable2"])
        if event["type"] == "add":
            doit = False
            if side_sel in self.selector_sides and self.state == MENU_STATE_IDLE:
                if sift_nei == self.sift_opt1: # and side_nei > 0:
                    opt = self.opts[0]["opts"][(side_nei + 0) % 4]
                    if opt and ("enable" not in opt or opt["enable"]):
                        doit = True
                elif sift_nei == self.sift_opt2: # and side_nei > 0:
                    opt = self.opts[1]["opts"][(side_nei + 0) % 4]
                    if opt and ("enable" not in opt or opt["enable"]):
                        doit = True
                if doit:
                    self.state = MENU_STATE_NEIGHBORED
                    self.neighbor_time = self._app.sim_time
                    self.paint_arrows(event["siftable1"])
                    self.paint_arrows(event["siftable2"])
#                    self._app.audio.play("neighbor")
            if not doit:
                self._app.play_sound(self.error_sound)
            
    def check_neighbor(self):
        if self.state != MENU_STATE_NEIGHBORED:
            return
        if not self.enough_sifts():
            return
#        print "menu state checking neighbors"
        opt = None
        any_side_selected = False
        for selector_side in self.selector_sides:
            if self.sift_selector.neighbors[selector_side] == self.sift_opt1:
                side = self.sift_opt1.neighbors.direction_of(self.sift_selector)
    #            if side > 0:
                opt = self.opts[0]["opts"][(side + 0) % 4]
                any_side_selected = True
            elif self.sift_selector.neighbors[selector_side] == self.sift_opt2:
                side = self.sift_opt2.neighbors.direction_of(self.sift_selector)
    #            if side > 0:
                opt = self.opts[1]["opts"][(side + 0) % 4]
                any_side_selected = True
        if opt and ("enable" not in opt or opt["enable"]):
            self.confirm_selection(opt)
#            self.paint_all()
            self._needs_paint = True

    def get_option_index(self, option):
#        print "------------------ get_option_index -------------------"
        index = 0
        # for dict in tuple
        for i, sift_opts in enumerate(self.opts):
            # for element in array from dict
            for opt in sift_opts["opts"]:
                if opt != None:
#                    print "get_option_index %d %s" % (index, opt)
                    # must compare object identity, not equivalent
                    # contents here (since two save slots can
                    # share the same labels and next state values
                    if option is opt:
                        return index
                    index += 1
        return None

    def get_chosen_option_index(self):
        return self.get_option_index(self.chosen_option)
    
    def confirm_selection(self, opt):
        self.state = MENU_STATE_CONFIRMED
        self.chosen_option = opt
        self.confirm_time = self._app.sim_time
        self.cleanup_event_handlers()
        self._app.play_sound(self.confirm_sound)

    def force_paint(self):
        self.paint_all()

    def paint_all(self):
        for s in self.siftables:
            self.paint_siftable(s)
            self.paint_arrows(s)

    def paint_siftable(self, siftable):
        if not self.enough_sifts():
            self.paint_insufficient(siftable)
        if siftable == self.sift_selector:
            self.paint_selector_bg(siftable)
        elif siftable == self.sift_opt1:
            if len(self.opts) > 0:
                self.paint_opt_bg(siftable, self.opts[0])
            else:
                self.paint_other_bg(siftable)
        elif siftable == self.sift_opt2:
            if len(self.opts) > 1:
                self.paint_opt_bg(siftable, self.opts[1])
            else:
                self.paint_other_bg(siftable)
        else:
            self.paint_other_bg(siftable)
#        self._app.need_repaint = True

    def paint_arrows(self, siftable):
        if not self.enough_sifts():
            return
        if siftable == self.sift_selector:
            self.paint_selector_arrows(siftable)
        elif siftable == self.sift_opt1:
            if len(self.opts) > 0:
                self.paint_opt_arrows(siftable, self.opts[0])
        elif siftable == self.sift_opt2:
            if len(self.opts) > 1:
                self.paint_opt_arrows(siftable, self.opts[1])
#        self._app.need_repaint = True

    def paint_insufficient(self, siftable):
        siftable.image(self.opt_bg)
        print "Not enough blocks!\nConnect blocks to continue."

    def paint_selector_bg(self, siftable):
        siftable.image(self.selector_bg)
#        self._app.paint_text_window(self.selector_text, siftable)
        self._font.paint(siftable, 
                         0, 
                         64, 
                         self.selector_text, 
                         area=(128,24), 
                         alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                         wrap=True, 
                         scale=1)

    def _selector_arrow_anim_cb(self, frame):
        pass
#        ap = int(128 * self.arrow_position) - 12
#        self.sift_selector.image(self.selector_bg, ap, 6, ap, 6, 24, 24)

    def paint_selector_arrows(self, siftable):
        """
        Update the animated arrow on the selector block.
        """
        ap = int(128 * self.arrow_position) - 12
#        self.sift_selector.image(self.selector_bg, ap, 6, ap, 6, 24, 24)
        # redraw whole row of texture, in case we are hitting the "64k cliff" performance bug 
        self.sift_selector.image(self.selector_bg, 0, 6, 0, 6, 128, 24)
#        clip_and_paint((ap, 6, 24, 24), Color(0,0,0), siftable)
        self._selector_arrow_anim.imageDraw(siftable, ap, 6)

    def reset_pulse(self):
        self.pulse_state = 3
        self.pulse_direction = -1
        self.pulse_time = self._app.sim_time

    def paint_opt_bg(self, siftable, opt):
        siftable.image(self.opt_bg)
        if opt["title"]:
            self._font.paint(siftable, 
                             0, 
                             0, 
                             opt["title"], 
                             area=(128,24), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                             scale=1)
        vert_offset = 23
        horiz_offset = 32
        for side, coords in enumerate(((0, vert_offset),        # top   
                                       (-horiz_offset, 55),        # left  
                                       (0, 113 - vert_offset),        # bottom
                                       (horiz_offset, 55),)):     # right 
            if side < len(opt["opts"]) and opt["opts"][side] and opt["opts"][side]["label"]:
                self._font.paint(siftable, 
                                 coords[0], 
                                 coords[1], 
                                 opt["opts"][side]["label"], 
                                 area=(128,18), 
                                 alignment=(ALIGNMENT_CENTER, ALIGNMENT_TOP), 
                                 scale=1, 
                                 rotation=0)#((0 + 3) % 4))#rotation=((side + 3) % 4))

    def paint_opt_arrows(self, siftable, opt):
        if self.state == MENU_STATE_CONFIRMED:
            return
        # set ap to middle pixel, minus half of arrow icon width
        ap = int(128 * self.arrow_position) - 8
        edge_offset = 2
        for side, coords in enumerate(((ap, edge_offset),         # top   
                                       (edge_offset, ap),         # left   
                                       (ap, 112 - edge_offset),       # bottom 
                                       (112 - edge_offset, ap),)):    # right
            if side < len(opt["opts"]):   
                o = opt["opts"][side]
                if o:
                    if self.state != MENU_STATE_NEIGHBORED or siftable.neighbors[((side + 0) % 4)] != self.sift_selector:
                        if "enable" not in o or o["enable"]:
                            image = "ui_receptor"
                            siftable.image(image, coords[0], coords[1], 0, 0, 16, 16, rotation=((side + 2) % 4))
                        else:
                            image = "ui_receptor_locked"
                            # draw an option icon
                            siftable.image(image, coords[0], coords[1], 0, 0, 16, 16)
                    else:
                        # erase by drawing the background image
                        siftable.image(self.opt_bg, coords[0], coords[1], coords[0], coords[1], 16, 16)

    def paint_other_bg(self, siftable):
        siftable.image(self.extra_bg)
