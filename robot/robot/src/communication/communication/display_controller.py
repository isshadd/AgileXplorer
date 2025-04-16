import gi
gi.require_version('Gtk', '3.0')
gi.require_version('Gdk', '3.0')
from gi.repository import Gtk, GdkPixbuf, GLib, Gdk
import math
import os

class DisplayWindow(Gtk.Window):
    def __init__(self):
        # S'assurer que GTK est initialisé
        if not Gtk.main_level():
            print("Initialisation de GTK...")
            Gtk.init(None)
            
        Gtk.Window.__init__(self, title="Robot Status")
        self.set_keep_above(True)  # Garder la fenêtre au premier plan
        
        # Activer la capture des touches avant la réalisation
        self.set_events(Gdk.EventMask.KEY_PRESS_MASK)
        
        # Créer une boîte verticale pour organiser les widgets
        self.box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.add(self.box)
        
        # Créer un label pour l'état
        self.status_label = Gtk.Label()
        self.status_label.set_markup('<span font="40">En attente</span>')
        self.box.pack_start(self.status_label, True, True, 0)
        
        # Image pour l'icône
        self.image = Gtk.Image()
        self.set_default_icon()
        self.box.pack_start(self.image, True, True, 0)
        
        # Connecter le gestionnaire de touches
        self.connect('key-press-event', self.on_key_press)
        
        # Mettre en plein écran et afficher
        self.fullscreen()
        self.show_all()

    def on_key_press(self, widget, event):
        """Gestionnaire d'événements de touches"""
        if event.keyval == Gdk.KEY_Escape:
            self.destroy()  # Ferme la fenêtre
            Gtk.main_quit()  # Quitte la boucle principale GTK
            return True
        return False
    
    def set_default_icon(self):
        """Affiche l'icône par défaut en attendant la comparaison des positions"""
        self.status_label.set_markup('<span font="40">En attente de position...</span>')
        self._set_icon_by_name("dialog-information-symbolic", 256)
        self.show_all()  # Force le rafraîchissement de l'affichage
    
    def set_far_icon(self):
        """Affiche l'icône pour le robot le plus éloigné"""
        self.status_label.set_markup('<span font="40" color="red">Plus Éloigné</span>')
        self._set_icon_by_name("dialog-warning-symbolic", 256)
        self.show_all()  # Force le rafraîchissement de l'affichage
    
    def set_near_icon(self):
        """Affiche l'icône pour le robot le plus proche"""
        self.status_label.set_markup('<span font="40" color="green">Plus Proche</span>')
        self._set_icon_by_name("emblem-ok-symbolic", 256)
        self.show_all()  # Force le rafraîchissement de l'affichage
    
    def set_single_robot_icon(self):
        """Affiche l'icône quand un seul robot est en P2P"""
        self.status_label.set_markup('<span font="40" color="blue">En Attente de Données</span>')
        self._set_icon_by_name("dialog-warning-symbolic", 256)
        self.show_all()  # Force le rafraîchissement de l'affichage
    
    def _set_icon_by_name(self, icon_name, size):
        """Définit l'icône à partir de son nom"""
        theme = Gtk.IconTheme.get_default()
        try:
            pixbuf = theme.load_icon(icon_name, size, 0)
            self.image.set_from_pixbuf(pixbuf)
        except Exception as e:
            print(f"Erreur lors du chargement de l'icône: {str(e)}")
