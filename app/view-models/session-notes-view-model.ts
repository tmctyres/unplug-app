import { Observable } from '@nativescript/core';
import { UserDataService, SessionNote } from '../models/user-data';
import { SecurityUtils } from '../utils/security-utils';

export interface SessionNoteInput {
  sessionDuration: number;
  note: string;
  mood?: 'great' | 'good' | 'okay' | 'challenging';
  activities?: string[];
}

export class SessionNotesViewModel extends Observable {
  private userDataService: UserDataService;
  private isAddingNote: boolean = false;

  constructor() {
    super();
    this.userDataService = UserDataService.getInstance();
    this.loadSessionNotes();
    this.initializeNewNoteForm();
  }

  private loadSessionNotes(): void {
    const recentNotes = this.userDataService.getSessionNotes(20); // Load last 20 notes
    const stats = this.userDataService.getSessionNotesStats();
    
    this.set('sessionNotes', recentNotes);
    this.set('totalNotes', stats.totalNotes);
    this.set('averageNoteLength', stats.averageLength);
    this.set('mostCommonMood', stats.mostCommonMood);
    this.set('hasNotes', recentNotes.length > 0);
  }

  private initializeNewNoteForm(): void {
    this.set('newNote', '');
    this.set('selectedMood', null);
    this.set('selectedActivities', []);
    this.set('isAddingNote', false);
    this.set('sessionDuration', 0);
    
    // Predefined activity options
    this.set('activityOptions', [
      { id: 'reading', name: 'Reading', icon: '📚' },
      { id: 'meditation', name: 'Meditation', icon: '🧘' },
      { id: 'exercise', name: 'Exercise', icon: '🏃' },
      { id: 'nature', name: 'Nature Walk', icon: '🌳' },
      { id: 'creative', name: 'Creative Work', icon: '🎨' },
      { id: 'social', name: 'Social Time', icon: '👥' },
      { id: 'rest', name: 'Rest/Sleep', icon: '😴' },
      { id: 'chores', name: 'Household Tasks', icon: '🏠' },
      { id: 'learning', name: 'Learning', icon: '🎓' },
      { id: 'music', name: 'Music', icon: '🎵' }
    ]);

    this.set('moodOptions', [
      { id: 'great', name: 'Great', icon: '😊', color: '#10B981' },
      { id: 'good', name: 'Good', icon: '🙂', color: '#3B82F6' },
      { id: 'okay', name: 'Okay', icon: '😐', color: '#F59E0B' },
      { id: 'challenging', name: 'Challenging', icon: '😔', color: '#EF4444' }
    ]);
  }

  onStartAddingNote(sessionDuration: number): void {
    this.set('sessionDuration', sessionDuration);
    this.set('isAddingNote', true);
    this.initializeNewNoteForm();
  }

  onMoodSelect(moodId: string): void {
    this.set('selectedMood', moodId);
  }

  onActivityToggle(activityId: string): void {
    const selectedActivities = this.get('selectedActivities') || [];
    const index = selectedActivities.indexOf(activityId);
    
    if (index === -1) {
      selectedActivities.push(activityId);
    } else {
      selectedActivities.splice(index, 1);
    }
    
    this.set('selectedActivities', [...selectedActivities]);
  }

  isActivitySelected(activityId: string): boolean {
    const selectedActivities = this.get('selectedActivities') || [];
    return selectedActivities.includes(activityId);
  }

  isMoodSelected(moodId: string): boolean {
    return this.get('selectedMood') === moodId;
  }

  onSaveNote(): void {
    const rawNote = this.get('newNote');
    const mood = this.get('selectedMood');
    const activities = this.get('selectedActivities') || [];
    const sessionDuration = this.get('sessionDuration');

    // Input validation and sanitization
    if (!rawNote || typeof rawNote !== 'string') {
      this.showError('Please enter a note about your session');
      return;
    }

    // Sanitize the note input
    const sanitizedNote = SecurityUtils.sanitizeInput(rawNote, 2000);

    if (sanitizedNote.trim().length === 0) {
      this.showError('Please enter a valid note about your session');
      return;
    }

    if (sanitizedNote.trim().length < 10) {
      this.showError('Please write at least 10 characters to make your note meaningful');
      return;
    }

    if (sanitizedNote.length > 2000) {
      this.showError('Note is too long. Please keep it under 2000 characters.');
      return;
    }

    // Validate session duration
    if (!SecurityUtils.isValidNumber(sessionDuration, 0, 24 * 60)) {
      this.showError('Invalid session duration');
      return;
    }

    // Validate mood if provided
    const validMoods = ['great', 'good', 'okay', 'challenging'];
    if (mood && !validMoods.includes(mood)) {
      this.showError('Invalid mood selection');
      return;
    }

    // Validate activities if provided
    const validActivityIds = ['reading', 'meditation', 'exercise', 'nature', 'creative', 'social', 'rest', 'chores', 'learning', 'music'];
    if (activities.some(activity => !validActivityIds.includes(activity))) {
      this.showError('Invalid activity selection');
      return;
    }

    // Rate limiting for note creation
    if (!SecurityUtils.rateLimiter.isAllowed('create_note', 10, 60000)) {
      this.showError('Too many notes created recently. Please wait a moment.');
      return;
    }

    try {
      const noteId = this.userDataService.addSessionNote(
        sessionDuration,
        sanitizedNote.trim(),
        mood,
        activities
      );

      this.showSuccess('Session note saved successfully!');
      this.set('isAddingNote', false);
      this.loadSessionNotes();

      // Emit event for parent components
      this.notifyPropertyChange('noteSaved', { noteId, note: sanitizedNote.trim() });

    } catch (error) {
      this.showError('Failed to save note. Please try again.');
      console.error('Error saving session note:', error);
    }
  }

  onCancelNote(): void {
    this.set('isAddingNote', false);
    this.initializeNewNoteForm();
  }

  onDeleteNote(noteId: string): void {
    const { Dialogs } = require('@nativescript/core');
    
    Dialogs.confirm({
      title: "Delete Note",
      message: "Are you sure you want to delete this session note? This action cannot be undone.",
      okButtonText: "Delete",
      cancelButtonText: "Cancel"
    }).then((result) => {
      if (result) {
        const success = this.userDataService.deleteSessionNote(noteId);
        if (success) {
          this.showSuccess('Note deleted successfully');
          this.loadSessionNotes();
        } else {
          this.showError('Failed to delete note');
        }
      }
    });
  }

  onEditNote(noteId: string): void {
    // For now, we'll just show the note details
    // In a full implementation, you'd open an edit dialog
    const note = this.userDataService.getSessionNotes().find(n => n.id === noteId);
    if (note) {
      const { Dialogs } = require('@nativescript/core');
      Dialogs.alert({
        title: "Session Note",
        message: `Date: ${new Date(note.sessionDate).toLocaleDateString()}\nDuration: ${note.sessionDuration} minutes\nMood: ${note.mood || 'Not specified'}\n\nNote: ${note.note}`,
        okButtonText: "Close"
      });
    }
  }

  formatNoteDate(date: Date): string {
    const noteDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - noteDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Today';
    } else if (diffDays === 2) {
      return 'Yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return noteDate.toLocaleDateString();
    }
  }

  formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
  }

  getMoodDisplay(mood?: string): { icon: string; color: string } {
    const moodOptions = this.get('moodOptions') || [];
    const moodOption = moodOptions.find(m => m.id === mood);
    return moodOption ? { icon: moodOption.icon, color: moodOption.color } : { icon: '😐', color: '#6B7280' };
  }

  getActivityDisplay(activities?: string[]): string {
    if (!activities || activities.length === 0) return '';
    
    const activityOptions = this.get('activityOptions') || [];
    const activityNames = activities.map(id => {
      const activity = activityOptions.find(a => a.id === id);
      return activity ? activity.icon + ' ' + activity.name : id;
    });
    
    return activityNames.join(', ');
  }

  private showSuccess(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'success', message });
  }

  private showError(message: string): void {
    this.notifyPropertyChange('showMessage', { type: 'error', message });
  }

  onBack(): void {
    const { Frame } = require('@nativescript/core');
    Frame.topmost().goBack();
  }

  // Getters for computed properties
  get canSaveNote(): boolean {
    const note = this.get('newNote');
    return note && note.trim().length >= 10;
  }

  get noteCharacterCount(): number {
    const note = this.get('newNote') || '';
    return note.length;
  }

  get selectedActivitiesCount(): number {
    const activities = this.get('selectedActivities') || [];
    return activities.length;
  }
}
