import sift.base_app
import sift.siftable
import sift.util
import csv
import codecs
import os
import types
import warnings
import maker_painter
import maker_states_common
from maker_siftablewrapper import *
from maker_constants import *
import maker_state_selector_menu
import maker
import maker_font_verdana_bold_18, maker_font_verdana_bold_24, maker_font_verdana_bold_36, maker_font_verdana_bold_48, maker_font_verdana_bold_60, maker_font_verdana_bold_72, maker_font_verdana_bold_84
from sift.util.font import ALIGNMENT_TOP, ALIGNMENT_CENTER, ALIGNMENT_BOTTOM, ALIGNMENT_LEFT, ALIGNMENT_MIDDLE, ALIGNMENT_RIGHT


IMAGE_SPLASH = "splash"
ENABLE_CHEATS = False

class GameRuleSetName:
    ACCURACY = "accuracy"
    ELAPSED = "elapsed"
    EXPLORE = "explore"
    COUNTDOWN = "countdown"
    ALL_NAMES = [ACCURACY, ELAPSED, EXPLORE, COUNTDOWN]


#-----------------------------------------------------------------------
class StateSplash(maker_state_selector_menu.StateSelectorMenu):

    def __init__(self, app, next):
        self._next_state = next
        super(StateSplash, self).__init__(app)
        print "init splash state, next is %s" % next
        self._app.set_game_data({'time': self._app.sim_time,
                                 'num_puzzles': 0,
                                 'puzzle_file': 'UNKNOWN',
                                 'error_file': None,
                                 'scored': True,
                                 'max_time': float('inf'),
                                 'warning_time': 10,
                                 'defer_on_too_many_guesses':  False,
                                 'round_index': 0,
                                 'correct': 0,
                                 'incorrect':0,
                                 'score':0})

    def setup(self):
        super(StateSplash, self).setup()
        print "starting state splash"
        self._title_text = None
        self._title_image = 'title'
        self._instructions = "Create a row to solve each puzzle"
        file_name = 'info.csv'
        #self._path_puzzles, scriptname = os.path.split(__file__)
        # JDH: use data path (available in new Python SDK)
        self._path_puzzles = self._app.data_path
        self._path_puzzles += '/assets/puzzles/'
        if not self._load_info(file_name):
            self._app.get_game_data()['error_file'] = file_name
        else:
            self._app.play_sound("music_title.mp3", loop=True)

    #def cleanup(self):
    #    self._app.stop_sound("music_title.mp3")
        
    def tick(self):
        next_state = super(StateSplash, self).tick()
        if self._app.get_game_data()['error_file']:
            return maker.GameState.FILE_ERROR
        if next_state:
            print "starting state %s" % next_state
        return next_state
    
    def _load_info(self, file_name):
        #self.path_levels, scriptname = os.path.split(__file__)
        # JDH: use data path (available in new Python SDK)
        self.path_levels = self._app.data_path
        print "--loading %s ---" % (self._path_puzzles + file_name)
        valid_row_index = 0
        try:
            with open(self._path_puzzles + file_name, 'rb') as f:
                reader = unicode_csv_reader(f)
                for i, row in enumerate(reader):
                    # TODO error checking and display 
                    if is_row_option_or_info_data(row):
                        if len(row) == 1:
                            if valid_row_index == 0:
                                if _is_image_name(row[0], self._app.siftables[0]):
                                    # FIXME workaround Sifteo Python SDK does not support
                                    # Unicode file names
                                    self._title_image = row[0].encode('ascii', 'ignore')
                                    self._title_text = None                                      
                                else:
                                    self._title_text = row[0]  
                                    self._title_image = None
                            elif valid_row_index == 1:
                                self._instructions = row[0]
                            else:
                                return False
                        else:
                            return False
                        valid_row_index += 1
#                    print row
        except IOError:
            return False
        return valid_row_index == 2 
            
    def setup_opts(self):
        self.selector_text = "SELECT"
        self.selector_sides = [0]
        opt1 = {
            "title":" ",
            "opts":[
                None,
                None,
                {"value":self._next_state, "label":"Play!",},
                None,
            ],
        }
        opt2 = {
            "title":" ",
            "opts":[
                None,
                None,
                None,
                None,
            ],
        }
        self.opts = (opt1,opt2)

    def paint_opt_bg(self, siftable, opt):
        super(StateSplash, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt1:
            # paint title image, or default backdrop and font text if
            # only text is specified
            if self._title_image:
                siftable.image(self._title_image)
            else:
                # paint title text
                siftable.image("ui_menu_title")
                maker_font_verdana_bold_18.FONT.paint(siftable, 
                                              3, 
                                              35, 
                                              self._title_text, 
                                              area=(123,52), 
                                              alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE),
                                              wrap=True,
                                              scale=1,
                                              character_wrap=True)
            # paint selector target and prompt
            siftable.image("dialogueboxoverlay", 0, 90)
            self._font.paint(siftable, 
                             0, 
                             90, 
                             opt["opts"][2]["label"], 
                             area=(128,18), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_TOP))
        if not siftable is self.sift_opt1 and not siftable is self.sift_selector :
            siftable.image("ui_menu_bg")
            border_size = 3
            self._font.paint(siftable, 
                             border_size, 
                             border_size, 
                             self._instructions, 
                             area=(SCREEN_WIDTH - border_size*2, SCREEN_HEIGHT - border_size*2), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_TOP), 
                             wrap=True, 
                             scale=1,
                             character_wrap=True)

    def paint_other_bg(self, siftable):
        super(StateSplash, self).paint_other_bg(siftable)
        siftable.image(IMAGE_SPLASH) 


#-----------------------------------------------------------------------
class StateLoad(maker_states_common.StatePlayCommon):

    def __init__(self, app, next):
        super(StateLoad, self).__init__(app)
        self._next_state = next

    def setup(self):
        super(StateLoad, self).setup()
        self._reset()
        #self._path_puzzles, scriptname = os.path.split(__file__)
        # JDH: use data path (available in new Python SDK)
        self._path_puzzles = self._app.data_path
        self._path_puzzles += '/assets/puzzles/'
        game_data = self._app.get_game_data()
        # FIXME multiple error messages?
        if not self._load_puzzles():
            game_data['error_file'] = file_name
        file_name = 'options.csv'
        if not self._load_options(file_name):
            game_data['error_file'] = file_name
        self._finished = True
        print "FINISHED LOADING-------------------"
        print game_data

    def _reset(self):
        self._needs_paint = False
        self._app.puzzles = [[]]
        self._app.set_game_data({'time': self._app.sim_time,
                                 'num_puzzles': 0,
                                 'puzzle_file': 'UNKNOWN',
                                 'error_file': None,
                                 'scored': True,
                                 'max_time': float('inf'),
                                 'warning_time': 10,
                                 'defer_on_too_many_guesses':  False,
                                 'correct': 0,
                                 'round_index': 0,
                                 'incorrect':0,
                                 'score':0})
        self._finished = False
        
    def tick(self):
        if self._finished:
            return self._next_state
        return self._next_state
                            
    def _load_puzzles(self):
        file_name = "puzzles.csv"
        self._app.get_game_data()['puzzle_file'] = file_name
        self._app.puzzles = []
        #self.path_levels, scriptname = os.path.split(__file__)
        # JDH: use data path (available in new Python SDK)
        self.path_levels = self._app.data_path
        print "--loading %s ---" % (self._path_puzzles + file_name)
        try:
            with open(self._path_puzzles + file_name, mode='rb') as f:
                reader = unicode_csv_reader(f)
                append_new_round_for_next_puzzle = True
                for i, row in enumerate(reader):
                    # TODO error checking and display 
                    if is_row_a_round_terminator(row):
                        append_new_round_for_next_puzzle = True
                    elif not is_row_a_comment(row):
                        if append_new_round_for_next_puzzle:
                            self._app.puzzles.append([])
                            print "appending new round for row %d %s" % (i, row)
                            append_new_round_for_next_puzzle = False
                        round_puzzles = self._app.puzzles[len(self._app.puzzles) - 1]
                        if len(row) == 1:
                            # single word, split into letters
    #                        print "single word row %s" % list(row[0])
                            round_puzzles.append(list(row[0]))
                        else:
                            round_puzzles.append(row)
                    print row
        except IOError:
            return False
        # filter out puzzles that have more pieces than the
        # user has siftables
        num_sifts = len(self._app.siftables)
        for r, round in enumerate(self._app.puzzles):
            filtered_puzzles = []
            for i, p in enumerate(round):
                if self._get_num_puzzle_pieces(i, r) <= num_sifts:
                    filtered_puzzles.append(p)
            self._app.puzzles[r] = filtered_puzzles
        # remove empty rounds
        self._app.puzzles = [round for round in self._app.puzzles if len(round) > 0]
        print "+++ finished loading:"
        print self._app.puzzles
        if not self._verify_puzzles():
            return False
        return len(self._app.puzzles) > 0 and len(self._app.puzzles[0]) > 0
    
    def _verify_puzzles(self):
        for round_index, round_puzzles in enumerate(self._app.puzzles):
            for puzzle_index, row in enumerate(round_puzzles):
                print "verifying puzzle %d, %s" % (puzzle_index, row) 
                for piece_index in range(0, self._get_num_puzzle_pieces(puzzle_index, round_index)):    
                    side_match_values = self._get_puzzle_piece_side_match_values(piece_index, puzzle_index, round_index)
                    # make sure the side match values specified are valid
                    bad_side_match_val = None
                    for val in side_match_values:
                        if val and val != "":
                            matched_val = False
                            for j in range(0, self._get_num_puzzle_pieces(puzzle_index, round_index)):
                                if val == self._get_puzzle_piece_value(j, puzzle_index, round_index):
                                    matched_val = True
                                    break
                            if not matched_val:
                                bad_side_match_val = val
                                break
                    if bad_side_match_val != None:
                        print "invalid side match value specified in data: %s for puzzle %d" % (bad_side_match_val, puzzle_index)
                        return False
        return True

    def _load_options(self, file_name):
        #self.path_levels, scriptname = os.path.split(__file__)
        # JDH: use data path (available in new Python SDK)
        self.path_levels = self._app.data_path
        print "--loading %s ---" % (self._path_puzzles + file_name)
        valid_row_index = 0
        try:
            with open(self._path_puzzles + file_name, 'rb') as f:
                reader = unicode_csv_reader(f)
                for i, row in enumerate(reader):
                    # TODO error checking and display 
                    if is_row_option_or_info_data(row):
                        if len(row) == 1:
                            if valid_row_index == 0:
                                scored = row[0].lower()
                                self._app.get_game_data()['scored'] = (scored == "scored" or scored == "true")
                                # TODO implement by looking up
                                # derived variable values from data
                                # structure, and reading those elsewhere
                            elif valid_row_index == 1:
                                if float(row[0]) > 0:
                                    self._app.get_game_data()['max_time'] = float(row[0])
#                                print "MAX TIME in file %s" % self._app.get_game_data()['max_time']
                            elif valid_row_index == 2:
                                option = row[0].lower()
                                if option == "shuffle" or option == "shuffled" or option == "random":
                                    for round in self._app.puzzles:
                                        random.shuffle(round)
                            else:
                                return False
                        else:
                            return False
                        valid_row_index += 1
#                    print row
        except IOError:
            return False
        # update derived variables for rule set
        if self._app.get_game_data()['max_time'] != float("inf"):
            self._app.get_game_data()['defer_instead_of_skip'] = True
        else:
            self._app.get_game_data()['defer_instead_of_skip'] = False
        return valid_row_index <= 3    

        
#-----------------------------------------------------------------------
class StatePlay(maker_states_common.StatePlayCommon):

    def __init__(self, app, next):
        super(StatePlay, self).__init__(app)
        self._next_state = next

    def setup(self):
        super(StatePlay, self).setup()
#        print self._app.get_game_data()
        self._reset()
        for s in self._app.siftables:
            s.on("button_press", self.on_button_press)
            s.add_event_handler("flip_screendown", self.on_flip_screendown)
            # on_new_siftable already registered in parent class
        self._app.siftables.add_event_handler("neighbor_change", self.on_neighbor_change)
        self._painter = maker_painter.GamePainter(self._app)
        # update derived variables for rule set
        has_time_limit = (self._app.get_game_data()['max_time'] != float("inf"))
        if self._app.get_game_data()['scored'] == False:
            self._round_state = maker.GameState.ROUND_EXPLORE
            self._score_state = maker.GameState.SCORE_EXPLORE
        elif has_time_limit:
            self._round_state = maker.GameState.ROUND_COUNTDOWN
            self._score_state = maker.GameState.SCORE_COUNTDOWN
        else:
            self._round_state = maker.GameState.ROUND_ELAPSED
            self._score_state = maker.GameState.SCORE_ELAPSED
        self._init_current_round()
        

    def _reset(self):
        self._needs_paint = False
        self._quit = False
        self._puzzle_index = 0
        self._num_nondeferred_puzzles = 0
        self._num_connected_components = 0  
        self._solved = False
        self._solved_incorrectly = False
        self._next_puzzle_delay = float('inf')
        game_data = self._app.get_game_data()
        game_data['time'] = self._app.sim_time
        game_data['correct'] = 0
        game_data['incorrect'] = 0
        game_data['score'] = 0 

    def cleanup(self):
        super(StatePlay, self).cleanup()
        for s in self._app.siftables:
            s.remove_event_handler("button_press", self.on_button_press)
            s.remove_event_handler("flip_screendown", self.on_flip_screendown)
               
    def on_new_siftable(self, event):
        #print "on new siftable   StatePlay"
        # rescue/update wrappers to maintain game state
        rescued = len(self._app.rescued_wrappers) > 0
        self._app.on_new_siftable(event)
        # a new wrapper, or the rescued wrapper will not be mapped
        # to this siftable
        w = self._app.find_wrapper(event["siftable"])
        # draw a default screen if no wrapper game state was 
        # recovered or initialized (can happen if no more screens
        # remain to clear)
        if not rescued:
            # new wrapper, it will be the largest puzzle piece index
            # now possible
            puzzle_piece_index = len(self._app.wrappers.values()) + len(self._app.rescued_wrappers) - 1
            self._update_wrapper(w, puzzle_piece_index)
            print "updating new wrapper for new siftable %s" % w
            
    def on_button_press(self,event):
        # cheat!
        if ENABLE_CHEATS:
            self._solved = True
            self._next_puzzle_delay = 0
            self._app.play_sound("menu_confirm.mp3")
            print "cheating to next puzzle"

    def on_flip_screendown(self,event):
        if ENABLE_CHEATS:
            self._quit = True

    def on_neighbor_change(self, event):
        if self._app.get_game_data()['error_file']:
            return
        # when a neighbor pair changes, if the puzzle active,
        # update the "solved" status. A puzzle is active if
        # the game is not counting down until the next puzzle 
        if self._next_puzzle_delay == float('inf'):
            self._needs_paint = True
            self._solved = self._is_puzzle_solved()
            if self._solved:
                self._solved_incorrectly = False
                self._app.get_game_data()['correct'] += 1 
                #success!
                self._next_puzzle_delay = 2
                self._app.play_sound("game_correct.mp3")
                print "puzzle solved!"
            else:
                # FIXME only display incorrect visual for fixed time?
                # don't trigger incorrect visual if
                # num connected components of puzzle did not change
                num_connected_components = self._calc_num_connected_components()
                if num_connected_components != self._get_num_connected_components_in_solution():
                    self._solved_incorrectly = False
                if num_connected_components != self._num_connected_components and num_connected_components == self._get_num_connected_components_in_solution():
                    self._solved_incorrectly = True
                    self._app.get_game_data()['incorrect'] += 1
                    incorrect_key = "incorrect_%d" % self._puzzle_index
                    print "puzzle not solved yet"
                    # take action if too many wrong answers in a row
                    if not incorrect_key in self._app.get_game_data(): 
                        self._app.get_game_data()[incorrect_key] = 1
                    else:
                        self._app.get_game_data()[incorrect_key] += 1
                    MAX_GUESSES = 3
                    if self._app.get_game_data()[incorrect_key] >= MAX_GUESSES:
                        # send puzzle to the end of the line once
                        # if the flag to do this is set, and
                        # this puzzle hasn't been deferred already
                        # and this isn't the last remaining puzzle
                        round_puzzles = self._app.puzzles[self._app.get_game_data()['round_index']]
                        if (self._app.get_game_data()['defer_instead_of_skip'] and 
                            (self._num_nondeferred_puzzles < len(round_puzzles) or 
                             self._puzzle_index < self._num_nondeferred_puzzles - 1)):
                            round_puzzles.append(round_puzzles[self._puzzle_index])
                            # defer puzzle until later
                            self._next_puzzle_delay = 2
                        else:
                            # skip this puzzle forever
                            self._next_puzzle_delay = 4
                        self._app.play_sound("game_incorrect_max.mp3")
                    else:
                        self._app.play_sound("game_incorrect.mp3")

                self._num_connected_components = num_connected_components  
        # audio feedback for neighboring
        if event["type"] == "add":
#            print "neighbor %s %s %s" % (phob.wrapper.siftable.id, phob, self)
            self._app.play_sound("neighbor.mp3")
        elif event["type"] == "remove":
#            print "unneighbor %s %s %s" % (phob.wrapper.siftable.id, phob, self)
            self._app.play_sound("unneighbor.mp3")                    

    def _update_wrapper(self, w, puzzle_piece_index):
        # TODO set wrapper data
#        print w
#        print puzzle_piece_index
#            print self._puzzle_piece_indexes[i]
        w.set_puzzle_piece_index(puzzle_piece_index)
        w.set_puzzle_piece_text(self._get_puzzle_piece_text(puzzle_piece_index, self._puzzle_index, self._app.get_game_data()['round_index']))
        w.set_puzzle_piece_image(self._get_puzzle_piece_image(puzzle_piece_index, self._puzzle_index, self._app.get_game_data()['round_index']))
        w.set_puzzle_piece_side_match_values(self._get_puzzle_piece_side_match_values(puzzle_piece_index, self._puzzle_index, self._app.get_game_data()['round_index']))
        w.set_puzzle_piece_text_font(self._get_puzzle_piece_text_font(self._puzzle_index, self._app.get_game_data()['round_index']))
#        print w._puzzle_piece_text
#            print w._puzzle_piece_image
#            print w._puzzle_piece_side_match_values
        
    def tick(self):
        if self._app.get_game_data()['error_file']:
            return maker.GameState.FILE_ERROR
        if self._quit:
            return maker.GameState.SPLASH
        dt = self._app.dt
        game_data = self._app.get_game_data()
        if not self._next_puzzle_delay == float('inf') and self._next_puzzle_delay > 0:
            self._next_puzzle_delay -= dt
        elif self._next_puzzle_delay <= 0:
            if self._puzzle_index + 1 >= len(self._app.puzzles[self._app.get_game_data()['round_index']]):
                # save game_data to app, then return state for
                # state machine to advance to
                game_data['time'] = self._app.sim_time - game_data['time']
                round_index = self._app.get_game_data()['round_index']
                if round_index + 1 >= len(self._app.puzzles):
                    self._app.get_game_data()['round_index'] = 0 
                    return self._score_state
                else:
                    self._app.get_game_data()['round_index'] = 1 + round_index 
                    return self._round_state
            self._puzzle_index += 1
            self._init_current_puzzle()
            self._next_puzzle_delay = float('inf')
        else:
            # next puzzle delay is infinity, so the game should be active
            if game_data['time_remaining'] < float("inf"):
                if not self._needs_paint:
                    self._needs_paint = maker_painter.timer_needs_paint(game_data['time_remaining'],
                                                                        game_data['max_time'],
                                                                        dt) 
                if game_data['time_remaining'] <= 0:
                    # time's up!
                    self._app.play_sound("time_out.mp3")
                    self._app.get_game_data()['round_index'] = 0 
                    return self._next_state
                else:
                    if game_data['time_remaining'] > game_data['warning_time'] and game_data['time_remaining'] - dt <= game_data['warning_time']:
                        self._app.play_sound("time_low.mp3")
                    game_data['time_remaining'] -= dt
                game_data['time_remaining'] = max(0, game_data['time_remaining'])
                        
    def paint(self):
        if self._app.get_game_data()['error_file']:
            return
        if self._needs_paint:
            for wrapper in self._app.wrappers.values():
                wrapper._needs_paint = True
            self._needs_paint = False
        for wrapper in self._app.wrappers.values():
            if wrapper._needs_paint:
                game_data = self._app.get_game_data()
                paint_info = {"solve_attempted": self._solved or self._solved_incorrectly, 
                              "is_correct": self._solved,
                              "time_remaining": game_data['time_remaining'],
                              "time_max": game_data['max_time'],
                              "time_low": game_data['time_remaining'] <= game_data['warning_time']}
                wrapper.paint(self._painter,
                              self.get_puzzle_piece_siftables(),
                              paint_info)
#                              self._next_puzzle_delay > 0 and self._next_puzzle_delay != float('inf'))

    def _is_puzzle_solution_attempted(self):
#        print "connected components (no match vals) %d" % self._calc_num_connected_components()
        return self._calc_num_connected_components() == self._get_num_connected_components_in_solution()

    def _calc_num_connected_components(self):
        """
        Returns the number of separate groups of neighbored puzzle piece
        cubes.
        (A connected component is graph theory speak for a group
        of interconnected nodes)
        """
        connected_component_index = -1
        # record which connected component each sift is in as we
        # walk the graph recursively
        connected_component_sift_ids = []
        connected_component_unused_match_vals = []
#        self._record_connected_sifts(self._app.wrappers.values()[0], 
#                                     connected_component_index, 
#                                     connected_component_sift_ids,
#                                     connected_component_unused_match_vals,
#                                     ignore_match_vals=True)        
        for w in self._app.wrappers.values():
            if not self._is_puzzle_piece(w):
                continue
            already_recorded = False
            # check if already visited (from a neighbor wrapper)
            for cc in connected_component_sift_ids:
                for id in cc:
                    if id == w.siftable.id:
                        already_recorded = True
            if already_recorded:
                continue
            connected_component_index += 1
            connected_component_sift_ids.append([])
            connected_component_unused_match_vals.append([])
            self._record_connected_sifts(w, 
                                         connected_component_index, 
                                         connected_component_sift_ids,
                                         connected_component_unused_match_vals,
                                         ignore_match_vals=True)
        return len(connected_component_sift_ids)
    
    def _get_num_connected_components_in_solution(self):
        # FIXME fully support grouping puzzles, where num groups > 1
        # (they will currently work, but the negative feedback
        # on puzzle solve attempts will not trigger correctly)s
        # FIXME cache return value on puzzle init
        return 1
    
    def _is_puzzle_solved(self):
        # for each puzzle piece
        if not self._is_puzzle_solution_attempted():
            return False
        for s in self.get_puzzle_piece_siftables():
            w = self._app.wrappers[s.id]            
            # check if this puzzle piece is neighbored with puzzle
            # pieces with the correct values, according to data
            piece_val = w.get_puzzle_piece_text()
            if piece_val == None:
                piece_val = w.get_puzzle_piece_image()
            # check copies of this piece, not itself, to allow
            # pieces with the same text or image
            neighbors_match = False
            for s_same in self.get_puzzle_piece_siftables():
                w_same = self._app.wrappers[s_same.id]
                if piece_val == w_same.get_puzzle_piece_text() or piece_val == w_same.get_puzzle_piece_image():
                    # matches puzzle piece value, check neighbor
                    # match vals against this copy of the wrapper
                    # in the outer loop
                    neighbor_match_count = 0
                    neighbor_required_match_count = 0
                    match_vals = w.get_puzzle_piece_side_match_values()
                    # check each side of w_same with the side
                    # match vals from the puzzle piece wrapper from
                    # the outer loop
                    for side, neigh_sift in enumerate(s_same.neighbors):
                        match_val = match_vals[side]
                        if match_val:
                            neighbor_required_match_count += 1
                            if neigh_sift != None:
                                neighbor = self._app.wrappers[neigh_sift.id]
                                # check neighboring constraints from puzzle data
    #                            print "-----checking for % s against %s" % (match_val, neighbor.get_puzzle_piece_text())
                                if match_val == neighbor.get_puzzle_piece_text() or match_val == neighbor.get_puzzle_piece_image():
                                    neighbor_match_count += 1
    #                                print "not a match"
                                    break
    #                            else:
    #                                print "match!"
    #                                print "---------"
#                    print "---------"
                    if neighbor_match_count == neighbor_required_match_count:
                        neighbors_match = True
#                        print "neighbors match for %s" % piece_val
                        break
            if not neighbors_match:
                return False
        return True
                            
    def _record_connected_sifts(self, 
                                wrapper, 
                                connected_component_index, 
                                connected_component_sift_ids,
                                connected_component_unused_match_vals,
                                ignore_match_vals=False):
        # first record this siftable in the connected components list 
        # of lists
        connected_component_sift_ids[connected_component_index].append(wrapper.siftable.id)
#        print "recording id %d at index %d in %s" % (wrapper.siftable.id, connected_component_index, connected_component_sift_ids)
        # now record each neighbor that meets the neighboring
        # requirements set in puzzle data
        for side, neigh_sift in enumerate(wrapper.siftable.neighbors):
            # FIXME this code could work for puzzles that are
            # not constrained to horizontal rows, but that is
            # not desired in the Sorting app. Remove this
            # check against sides if it is desired in another app
            if side == 0 or side == 2:
                continue
            neighbor_matches = False
            data = wrapper.get_puzzle_piece_side_match_values()
            match_val = data[side]
            if neigh_sift != None:
                # FIXME this code could work for puzzles that are
                # not constrained to horizontal rows, but that is
                # not desired in the Sorting app. Remove this
                # check against sides if it is desired in another app
                if wrapper.siftable.neighbors.left is neigh_sift and not neigh_sift.neighbors.right is wrapper.siftable:
                    continue                
                if wrapper.siftable.neighbors.right is neigh_sift and not neigh_sift.neighbors.left is wrapper.siftable:
                    continue                
                if not neigh_sift.id in self._app.wrappers:
                    continue
                neighbor = self._app.wrappers[neigh_sift.id]
                # check neighboring constraints from puzzle data
                if ignore_match_vals or match_val:
                    neigh_val = neighbor.get_puzzle_piece_text()
                    if neigh_val == None:
                        neigh_val = neighbor.get_puzzle_piece_image()
#                        print "checking side match values for id:%d (match val:%s) [side:%d] and id:%d (match val:%s) [side:%d] " % (wrapper.siftable.id, match_val, side, neigh_sift.id, neigh_match_val, neigh_side)
                    if ignore_match_vals or match_val == neigh_val:
#                            print "matched neighbors!"
                        neighbor_matches = True
                        if not neighbor.siftable.id in connected_component_sift_ids[connected_component_index]:
                            self._record_connected_sifts(neighbor, 
                                                         connected_component_index, 
                                                         connected_component_sift_ids,
                                                         connected_component_unused_match_vals,
                                                         ignore_match_vals)
            if not neighbor_matches and match_val:
                connected_component_unused_match_vals[connected_component_index].append(match_val) 
             
    def _init_current_round(self):
        self._puzzle_index = 0
#        print "ROUND %d INITIALIZing" % self._app.get_game_data()['round_index']
        print self._app.puzzles
        self._num_nondeferred_puzzles = len(self._app.puzzles[self._app.get_game_data()['round_index']])
        game_data = self._app.get_game_data()
        game_data['num_puzzles'] = self._num_nondeferred_puzzles
        game_data['time_remaining'] = game_data['max_time']
#        print game_data
        self._init_current_puzzle()
   
    def _init_current_puzzle(self, reset_incorrect=True):
        self._solved = False
        self._solved_incorrectly = False
        puzzle_piece_indexes = range(0, len(self._app.wrappers.values())) 
        random.shuffle(puzzle_piece_indexes)
#        print puzzle_piece_indexes
        for i, w in enumerate(self._app.wrappers.values()):
            self._update_wrapper(w, puzzle_piece_indexes[i])
        self._needs_paint = True
        self._num_connected_components = self._calc_num_connected_components()
        if reset_incorrect:
            incorrect_key = "incorrect_%d" % self._puzzle_index  
            self._app.get_game_data()[incorrect_key] = 0
        
    def _get_puzzle_piece_text_font(self, puzzle_index, round_index):
        """
        Returns the largest font that each puzzle piece can use
        and fit to each screen
        """
        fonts = [maker_font_verdana_bold_84.FONT,
                 maker_font_verdana_bold_72.FONT,
                 maker_font_verdana_bold_60.FONT,
                 maker_font_verdana_bold_48.FONT,
                 maker_font_verdana_bold_36.FONT,
                 maker_font_verdana_bold_24.FONT,
                 maker_font_verdana_bold_18.FONT]
        BORDER_SIZE = 10
        MAX_WIDTH = 128 - (BORDER_SIZE * 2)
        MAX_HEIGHT = MAX_WIDTH
        for font in fonts:
            all_pieces_fit = True
            for i in range(0, self._get_num_puzzle_pieces(puzzle_index, round_index)):
                piece_text  = self._get_puzzle_piece_text(i, puzzle_index, round_index)
                if piece_text == None:
                    continue
                w, h = font.measure_bounds(piece_text, 
                                           area=(128, 100), 
                                           alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                                           wrap=False, 
                                           scale=1, 
                                           rotation=0, 
                                           character_wrap=False)
                print "text bounds for %s (%.3f, %.3f) font %s" % (piece_text, w, h, font.__dict__["line_height"])
                if w > MAX_WIDTH or h > MAX_HEIGHT:
                    all_pieces_fit = False
                    break
            if all_pieces_fit:
                print "picked font %s" % font.__dict__["line_height"]
                return font
        print "picked font %s" % fonts[len(fonts) - 1].__dict__["line_height"]
        return fonts[len(fonts) - 1]
    
    def _get_puzzle_piece_text(self, piece_index, puzzle_index, round_index):
        label = self._get_puzzle_piece_value(piece_index, puzzle_index, round_index)
        if not _is_image_name(label, self._app.siftables[0]):
            return label
    
    def _get_puzzle_piece_image(self, piece_index, puzzle_index, round_index):
        label = self._get_puzzle_piece_value(piece_index, puzzle_index, round_index)
        if _is_image_name(label, self._app.siftables[0]):
            return label            
        
    def _get_current_num_puzzle_pieces(self):
        return self._get_num_puzzle_pieces(self._puzzle_index, self._app.get_game_data()['round_index'])
        
    def get_puzzle_piece_siftables(self):
        sifts = []
        num_pieces = self._get_current_num_puzzle_pieces() 
        for i, w in enumerate(self._app.wrappers.values()): 
            if w.get_puzzle_piece_index() < num_pieces:
                sifts.append(w.siftable)
        return sifts
    
    def _is_puzzle_piece(self, wrapper):
        num_pieces = self._get_current_num_puzzle_pieces() 
        for i, w in enumerate(self._app.wrappers.values()): 
            if w.get_puzzle_piece_index() < num_pieces and wrapper is w:
                return True
        return False    
    
#-----------------------------------------------------------------------
class StateScoreCommon(maker_state_selector_menu.StateSelectorMenu):

    def __init__(self, app, next):
        self._next_state = next
        super(StateScoreCommon, self).__init__(app)
            
    def setup_opts(self):
        self.selector_text = "SELECT"
        self.selector_sides = [0]
        opt1 = {
            "title":" ",
            "opts":[
                {"value":maker.GameState.SPLASH, "label":"Quit",},
                None,
                {"value":self._next_state, "label":"Retry",},
                None,
            ],
        }
        opt2 = {
            "title":" ",
            "opts":[
                None,
                None,
                None,
                None,
            ],
        }
        self.opts = (opt1,opt2)
        

#-----------------------------------------------------------------------
class StateScoreAccuracy(StateScoreCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateScoreAccuracy, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            game_data = self._app.get_game_data()
            if game_data['correct'] == game_data['num_puzzles']:
                if game_data['incorrect'] == 0:
                    encouragement = "Perfect!"
                elif game_data['incorrect'] < game_data['num_puzzles']/2.0:
                    encouragement = "Great!"
                else:
                    encouragement = "Completed!"                     
            else:  
                encouragement = "Nice Try!" 
            self._font.paint(siftable, 
                             16, 
                             16, 
                             "%s\n\nscore: %d\n%d/%d\n%d guesses" % (encouragement,
                                                                  game_data['score'],
                                                                  game_data['correct'],
                                                                  game_data['num_puzzles'],
                                                                  game_data['num_puzzles'] + game_data['incorrect']), 
                             area=(96,96), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                             wrap=True, 
                             scale=1)


#-----------------------------------------------------------------------
class StateScoreCountdown(StateScoreCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateScoreCountdown, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            _paint_opt_bg_score_countdown(siftable, opt, self._app.get_game_data(), self._font)

            
def _paint_opt_bg_score_countdown(siftable, opt, game_data, font):
    if game_data['correct'] == game_data['num_puzzles']:
        if game_data['incorrect'] == 0:
            encouragement = "Perfect!"
        elif game_data['incorrect'] < game_data['num_puzzles']/2.0:
            encouragement = "Great!"
        else:
            encouragement = "Completed!"                     
    else:  
        encouragement = "Nice Try!" 
    border_size = 3
    if game_data['incorrect'] == 1:
        font_str = "%s\n\n%d/%d solved\n%d wrong guess\n%.0f sec. left"
    else:
        font_str = "%s\n\n%d/%d solved\n%d wrong guesses\n%.0f sec. left"                
    font.paint(siftable, 
                 border_size, 
                 border_size, 
                 font_str % (encouragement,
                             game_data['correct'],
                             game_data['num_puzzles'],
                             game_data['incorrect'],
                             game_data['time_remaining'],), 
                 area=(SCREEN_WIDTH - border_size*2, SCREEN_HEIGHT - border_size*2), 
                 alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                 wrap=True, 
                 scale=1)

def _paint_opt_bg_score_elapsed(siftable, opt, game_data, font):    
    if game_data['correct'] == game_data['num_puzzles']:
        if game_data['incorrect'] == 0:
            encouragement = "Perfect!"
        elif game_data['incorrect'] < game_data['num_puzzles']/2.0:
            encouragement = "Great!"
        else:
            encouragement = "Completed!"                     
    else:  
        encouragement = "Nice Try!" 
    border_size = 3
    if game_data['incorrect'] == 1:
        font_str = "%s\n\n%d/%d solved\n%d wrong guess\n%.0f sec."
    else:
        font_str = "%s\n\n%d/%d solved\n%d wrong guesses\n%.0f sec."                
    font.paint(siftable, 
                 border_size, 
                 border_size, 
                 font_str % (encouragement,
                             game_data['correct'],
                             game_data['num_puzzles'],
                             game_data['incorrect'],
                             game_data['time'],), 
                 area=(SCREEN_WIDTH - border_size*2, SCREEN_HEIGHT - border_size*2), 
                 alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                 wrap=True, 
                 scale=1)
        
#-----------------------------------------------------------------------
class StateScoreElapsed(StateScoreCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateScoreElapsed, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            _paint_opt_bg_score_elapsed(siftable, opt, self._app.get_game_data(), self._font)

#-----------------------------------------------------------------------
class StateScoreExplore(StateScoreCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateScoreExplore, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            game_data = self._app.get_game_data()
            if game_data['correct'] == game_data['num_puzzles']:
                if game_data['incorrect'] == 0:
                    encouragement = "Perfect!"
                elif game_data['incorrect'] < game_data['num_puzzles']/2.0:
                    encouragement = "Great!"
                else:
                    encouragement = "Completed!"                     
            else:  
                encouragement = "Nice Try!" 
            self._font.paint(siftable, 
                             16, 
                             16, 
                             "%s" % (encouragement), 
                             area=(96,96), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                             wrap=True, 
                             scale=1)


#-----------------------------------------------------------------------
class StateRoundCommon(maker_state_selector_menu.StateSelectorMenu):

    def __init__(self, app, next):
        self._next_state = next
        super(StateRoundCommon, self).__init__(app)
            
    def setup_opts(self):
        self.selector_text = "SELECT"
        self.selector_sides = [0]
        opt1 = {
            "title":" ",
            "opts":[
                {"value":maker.GameState.SPLASH, "label":"Quit",},
                None,
                {"value":self._next_state, "label":"Next Round",},
                None,
            ],
        }
        opt2 = {
            "title":" ",
            "opts":[
                None,
                None,
                None,
                None,
            ],
        }
        self.opts = (opt1,opt2)

#-----------------------------------------------------------------------
class StateRoundAccuracy(StateRoundCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateRoundAccuracy, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            game_data = self._app.get_game_data()
            if game_data['correct'] == game_data['num_puzzles']:
                if game_data['incorrect'] == 0:
                    encouragement = "Perfect!"
                elif game_data['incorrect'] < game_data['num_puzzles']/2.0:
                    encouragement = "Great!"
                else:
                    encouragement = "Completed!"                     
            else:  
                encouragement = "Nice Try!" 
            self._font.paint(siftable, 
                             16, 
                             16, 
                             "%s\n\nscore: %d\n%d/%d\n%d guesses" % (encouragement,
                                                                  game_data['score'],
                                                                  game_data['correct'],
                                                                  game_data['num_puzzles'],
                                                                  game_data['num_puzzles'] + game_data['incorrect']), 
                             area=(96,96), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                             wrap=True, 
                             scale=1)


#-----------------------------------------------------------------------
class StateRoundCountdown(StateRoundCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateRoundCountdown, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            _paint_opt_bg_score_countdown(siftable, opt, self._app.get_game_data(), self._font)

        
#-----------------------------------------------------------------------
class StateRoundElapsed(StateRoundCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateRoundElapsed, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            _paint_opt_bg_score_elapsed(siftable, opt, self._app.get_game_data(), self._font)


#-----------------------------------------------------------------------
class StateRoundExplore(StateRoundCommon):

    def paint_opt_bg(self, siftable, opt):
        super(StateRoundExplore, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            game_data = self._app.get_game_data()
            if game_data['correct'] == game_data['num_puzzles']:
                if game_data['incorrect'] == 0:
                    encouragement = "Perfect!"
                elif game_data['incorrect'] < game_data['num_puzzles']/2.0:
                    encouragement = "Great!"
                else:
                    encouragement = "Completed!"                     
            else:  
                encouragement = "Nice Try!" 
            self._font.paint(siftable, 
                             16, 
                             16, 
                             "%s" % (encouragement), 
                             area=(96,96), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                             wrap=True, 
                             scale=1)


#-----------------------------------------------------------------------
class StateFileError(maker_state_selector_menu.StateSelectorMenu):

    def __init__(self, app, next):
        self._next_state = next
        super(StateFileError, self).__init__(app)

    def setup_opts(self):
        self.selector_text = "SELECT"
        self.selector_sides = [0]
        opt1 = {
            "title":" ",
            "opts":[
                None,
                None,
                {"value":self._next_state, "label":"Reload",},
                None,
            ],
        }
        opt2 = {
            "title":" ",
            "opts":[
                None,
                None,
                None,
                None,
            ],
        }
        self.opts = (opt1,opt2)

    def paint_opt_bg(self, siftable, opt):
        super(StateFileError, self).paint_opt_bg(siftable, opt)
        if siftable == self.sift_opt2:
            file_name = self._app.get_game_data()['error_file']
            file_name = '\'' + file_name.split('.')[0] + '\''
            self._font.paint(siftable, 
                             16, 
                             16, 
                             "Failed to load %s, please check the file" % file_name, 
                             area=(96,96), 
                             alignment=(ALIGNMENT_CENTER, ALIGNMENT_MIDDLE), 
                             wrap=True, 
                             scale=1)


def is_row_a_round_terminator(row):
    row_len = len(row) 
    if  row_len == 0:
#            print "IGNORING ROW %s" % row
        return True
    return False

def is_row_a_comment(row):
    for s in row:
        # remove non-letter characters and check for the "ignore row"
        # token
        stripped_lower = re.sub(r'[^a-zA-Z]+', '', s).lower()
        if  'ignore row' == stripped_lower or 'ignorerow' == stripped_lower:
#                print "IGNORING ROW %s" % row
            return True
    return False

def is_row_option_or_info_data(row):
    return not is_row_a_round_terminator(row) and not is_row_a_comment(row)

def _is_image_name(img, siftable):
    # Lookup the actual image if it is a string or number
    if type(img) is not sift.image.SiftImage:
        try:
            str_type = type(img)
            if str_type is types.UnicodeType or str_type is types.StringType:
                base, extension = os.path.splitext(img)
                img= base
            img = siftable.root_set.image_set[img]
        except:
#            print "-------------------------------- WARNING: exception while checking image name "
#            print repr(img)
#            print sys.exc_info()[0]
            return False
    return True

def unicode_csv_reader(utf8_data, dialect=csv.excel, **kwargs):
    csv_reader = csv.reader(utf8_data, dialect=dialect, **kwargs)
    for row in csv_reader:
        # convert to unicode, stripping any Byte Order Marker
        yield [unicode(cell, 'utf-8').lstrip(unicode(codecs.BOM_UTF8, "utf8")) for cell in row]