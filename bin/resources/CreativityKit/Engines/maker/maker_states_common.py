import sift.base_app
import sift.siftable
import sift.util
import csv
import os
import types
import warnings
import maker_painter
import maker_font_verdana_bold_18
from maker_siftablewrapper import *
import maker_state_selector_menu


class PuzzleDataIndex:
    """
    Indexes for puzzle Comma Seprated Value file columns. CSV files
    in assets\puzzles are the user-generated content files that
    define puzzles.
    """
    PIECE_0 = 0
    PIECE_1 = 1
    PIECE_2 = 2
    PIECE_3 = 3
    PIECE_4 = 4
    PIECE_5 = 5
    # There are four match value indexes per cube, for cubes 0 to 5
    # I didn't bother specifying indexes for cubes 1 through 5
    TOP_MATCH_VALUE_0 = 6
    LEFT_MATCH_VALUE_0 = 7
    BOTTOM_MATCH_VALUE_0 = 8
    RIGHT_MATCH_VALUE_0 = 9


class StatePlayCommon(object):
    """
    State machine state to subclass for game states, in order to
    make sure that add/remove siftable events are handled
    """
    def __init__(self, app):
        self._app = app
        self._font = maker_font_verdana_bold_18.FONT

    def setup(self):
        self._app.siftables.on("new_siftable", self.on_new_siftable)
        self._app.siftables.on("lost_siftable", self.on_lost_siftable)

    def cleanup(self):
        self._app.siftables.remove_event_handler("new_siftable", self.on_new_siftable)
        self._app.siftables.remove_event_handler("lost_siftable", self.on_lost_siftable)
    
    def paint(self):
        pass
    
    def on_new_siftable(self, event):
        self._app.on_new_siftable(event)
            
    def on_lost_siftable(self, event):
        self._app.on_lost_siftable(event)

    def _get_num_puzzle_pieces(self, puzzle_index, round_index):
#        print "**************************************************************"
#        print self._app.puzzles
#        print self._puzzle_file_index
#        print "**************************************************************"
        puzzle_data = self._app.puzzles[round_index][puzzle_index]
        num = 0
        for i in range(0, min(len(puzzle_data),
                              PuzzleDataIndex.PIECE_5 + 1)): 
            if puzzle_data[i]:
                num += 1
        return num

    def _get_default_puzzle_piece_side_match_values(self, piece_index, puzzle_index, round_index):
        """
        Returns default values to make the pieces into a
        left to right sequence
        """
        num_puzzle_pieces = self._get_num_puzzle_pieces(puzzle_index, round_index)
        if piece_index == 0:
            # first, match second on right
            return ['', '', '', self._get_puzzle_piece_value(1, puzzle_index, round_index)]
        elif piece_index == num_puzzle_pieces - 1:
            # last, match previous on left
            return ['', self._get_puzzle_piece_value(piece_index - 1, puzzle_index, round_index), '', '']
        elif piece_index < num_puzzle_pieces - 1:
            # middle, match previous on left, next on right
            return ['', self._get_puzzle_piece_value(piece_index - 1, puzzle_index, round_index), '', self._get_puzzle_piece_value(piece_index + 1, puzzle_index, round_index)]
        else:
            # past the end, not a piece, no matches
            return ['', '', '', '']

    def _get_puzzle_piece_value(self, piece_index, puzzle_index, round_index):
        if piece_index < self._get_num_puzzle_pieces(puzzle_index, round_index):
            label = self._app.puzzles[round_index][puzzle_index][piece_index]
            label = label.strip()
            return label
    
    def _get_puzzle_piece_side_match_values(self, piece_index, puzzle_index, round_index):
        if (self._puzzle_has_side_match_values(puzzle_index, round_index) and 
            piece_index < self._get_num_puzzle_pieces(puzzle_index, round_index)):
            max_puzzle_data_index = len(self._app.puzzles[round_index][puzzle_index]) - 1
            slice_start = piece_index * 4 + PuzzleDataIndex.TOP_MATCH_VALUE_0
            if slice_start > max_puzzle_data_index:
                # no match vals for this piece, return defaults
                return self._get_default_puzzle_piece_side_match_values(piece_index, puzzle_index, round_index)
            slice_terminator = slice_start + 4
            if slice_terminator > max_puzzle_data_index + 1:
                # only partial listing of match vals for this piece, 
                # read what is available
                slice_terminator = max_puzzle_data_index + 1 
#            print "###############"
#            print piece_index
#            print slice_start
#            print slice_terminator
            side_match_values = self._app.puzzles[round_index][puzzle_index][slice_start : slice_terminator]
#            print "side match vals %s"  % side_match_values  
#            print "###############"
            len_side_match_values = len(side_match_values)
            if len_side_match_values < 4:
                # only partial listing of match vals for this piece, 
                # fill out to all 4 sides with default values
                if len_side_match_values > 0:
                    # some values were specified, fill the rest of 
                    # the sides with "no value"
                    default_side_match_values = ['', '',  '',  '']
                else:  
                    # no values were specified, use all defaults
                    default_side_match_values = self._get_default_puzzle_piece_side_match_values(piece_index, puzzle_index, round_index)
                for i, val in enumerate(default_side_match_values):
                    if i >= len_side_match_values:
                        side_match_values.append(val)
            return side_match_values
        else:
            return self._get_default_puzzle_piece_side_match_values(piece_index, puzzle_index, round_index)

    def _puzzle_has_side_match_values(self, puzzle_index, round_index):
        puzzle_data = self._app.puzzles[round_index][puzzle_index]
        for i in range(PuzzleDataIndex.TOP_MATCH_VALUE_0, 
                       min(len(puzzle_data), 
                           PuzzleDataIndex.RIGHT_MATCH_VALUE_0 + 21)):
            if puzzle_data[i]:
                return True
        return False

#class StatePlayCommon(StateCommon):
#        
#    def on_new_siftable(self, event):
#        rescued = len(self._app.rescued_wrappers) > 0
#        self._app.on_new_siftable(event)
#        # a new wrapper, or the rescued wrapper will not be mapped
#        # to this siftable
#        w = self._app.find_wrapper(event["siftable"])
#        # draw a default screen if no wrapper game state was 
#        # recovered or initialized (can happen if no more screens
#        # remain to clear)
#        if rescued:
#            # nothing to do
#            pass
#        elif self._app.has_pending_level_screens():
#            self.update_wrapper(w)
##            print "updating new wrapper"
#        else:
#            w.init_level_default_screen()
#        #            event["siftable"].image(IMAGE_PLAY_UNPLAYABLE)
##            print "unused new siftable, setting cover image"
#
#    def update_wrapper(self, w):
#        w.init_level(self._app._level_screens[self._app._next_level_screen], self._app._next_level_screen)
#        self._app._next_level_screen += 1
#
#    def tick(self):
##        super(StatePlayCommon).tick()
#        screen_to_hint_dict = self._app.get_screen_to_hint_dict()
#        for w in self._app.wrappers.values():
##            print "add hint?"
#            # update all moving balls
#            if len([b for b in w.get_balls() if not is_near_zero(b.vx) or not is_near_zero(b.vy)]) > 0:
##                print "remove?"
#                if w.hint != None:
##                    print "REMOVE hint phob"
#                    if ENABLE_NON_FATAL_ASSERTS:                            
#                        assert w.hint in w._movers
#                    w.hint.dead = True
#                    w.should_paint_hint = False
#            elif w.should_paint_hint and w.is_in_play() and w._level_screen in screen_to_hint_dict and w.hint == None:
#                drawable_area = (SCREEN_WIDTH - BORDER_SIZE * 2, SCREEN_HEIGHT - BORDER_SIZE * 2)
#                alignment = (ALIGNMENT_CENTER, ALIGNMENT_MIDDLE)
#                hint_txt = screen_to_hint_dict[w._level_screen]
#                width, height = self._font.measure_bounds(hint_txt, 
#                                                 area=drawable_area, 
#                                                 alignment=alignment, 
#                                                 wrap=True)
#                hint_dimensions = (drawable_area[0], height + 7)
#                x = BORDER_SIZE
#                y = SCREEN_HEIGHT - (BORDER_SIZE + hint_dimensions[1])
#                obj_desc = ObjectDesc()
#                obj_desc.type = ObjectType.OVERLAY
#                obj_desc.collidable = False        
#                obj_desc.width = hint_dimensions[0]
#                obj_desc.height = hint_dimensions[1]
#                obj_desc.x = x
#                obj_desc.y = y
#                obj_desc.v = Vec2(0, 0)
#                obj_desc.max_speed = 0
#                obj_desc.color = self._app.get_bg_color()
#                obj_desc.paint_pass = 1
#                desc = EffectDesc('hint',
#                                  HintEffect, 
#                                  (hint_txt, self._app.get_bg_color()),
#                                  -1, 
#                                  EffectDomain.MOVER)
#                obj_desc.effect_descs.append(desc)
#                obj_desc.attack_stats[0] = AttackStat.NONE
#                obj_desc.attack_stats[1] = AttackStat.INVULNERABLE
#                new_phobs = w.spawn_by_obj_desc(obj_desc)
#                if ENABLE_NON_FATAL_ASSERTS:                                            
#                    assert len(new_phobs) == 1
#                w.hint = new_phobs[0]
##                print "Created hint phob %s" % w.hint
#        
#    def paint(self):
#        screen_to_hint_dict = self._app.get_screen_to_hint_dict()
##        print screen_to_hint_dict
#        for w in self._app.wrappers.values():
#            first_paint = w.first_paint
#            w.paint()        
##            if not first_paint and w._level_screen != 0:
##                print "painting second screen second time"
##            if first_paint and len(screen_to_hint_dict.keys()) > 0:
##                if w.should_paint_hint and w.is_in_play() and w._level_screen in screen_to_hint_dict:
###                    print "%d should not be in %s" % (w._level_screen, self._app._visited_level_screens)
##                    # paint screen specific hint
##                    self._paint_hint(screen_to_hint_dict[w._level_screen], w.siftable)
