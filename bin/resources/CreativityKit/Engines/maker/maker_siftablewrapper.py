import random
import maker
from sift.util.font import *
from sift.util.color import Color
import maker, maker_font_verdana_bold_18, maker_font_verdana_bold_24, maker_font_verdana_bold_48, maker_font_verdana_bold_84


class SiftableWrapper:
    """
    Contains game specific data and behavior for each siftable
    """    
    def __init__(self, sift, app):
        self._app = app
        self.siftable = sift
        self.id = sift.id
        self._needs_paint = False
        self.number = -1
        self.done = False
        self._puzzle_piece_index = None
        self._puzzle_piece_text = None
        self._puzzle_piece_text_font = maker_font_verdana_bold_48.FONT
        self._puzzle_piece_image = None
        self._puzzle_piece_side_match_values = ['', '', '', '']

    def set_puzzle_piece_index(self, i):
        self._puzzle_piece_index = i

    def get_puzzle_piece_index(self):
        return self._puzzle_piece_index
        
    def set_puzzle_piece_text(self, text):
        self._puzzle_piece_text = text
        self._needs_paint = True

    def set_puzzle_piece_text_font(self, font):
        self._puzzle_piece_text_font = font
        self._needs_paint = True

    def set_puzzle_piece_image(self, image):
        self._puzzle_piece_image = image
        self._needs_paint = True

    def set_puzzle_piece_side_match_values(self, match_vals):
        self._puzzle_piece_side_match_values = match_vals
        self._needs_paint = True

    def get_puzzle_piece_text(self):
        return self._puzzle_piece_text

    def get_puzzle_piece_image(self):
        return self._puzzle_piece_image

    def get_puzzle_piece_side_match_values(self):
        return self._puzzle_piece_side_match_values
                                                                         
    def paint(self, 
              painter, 
              puzzle_piece_siftables,
              paint_info={"solve_attempted": False, 
                          "is_correct": False,
                          "time_remaining": float("inf"),
                          "time_max": float("inf"),
                          "time_low": False}):
        if not self._needs_paint: #or (self._puzzle_piece_data == None:
            return
#        print "paint %s" % self
        if self._puzzle_piece_image:
#            print "image %s" % self._puzzle_piece_image
            # a fullscreen image was specified 
            # in the puzzle data file
            self.siftable.image(self._puzzle_piece_image)
        else:
            painter.paint_puzzle_bg(self.siftable)
        if self._puzzle_piece_text:
            painter.paint_puzzle_text(self.siftable, 
                                      self._puzzle_piece_text,
                                      self._puzzle_piece_text_font,
                                      paint_info["time_remaining"],
                                      paint_info["time_max"],
                                      paint_info["time_low"])
            # FIXME specify font size
        painter.paint_puzzle_borders(self.siftable,
                                    puzzle_piece_siftables=puzzle_piece_siftables, 
                                    solve_attempted=paint_info["solve_attempted"], 
                                    is_correct=paint_info["is_correct"])
        self.siftable.repaint()
        self._needs_paint = False