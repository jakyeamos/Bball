import { useState } from 'react';
import { Card } from '../components/Cards';
import { Button, DecisionButton } from '../components/Buttons';
import { Tag } from '../components/Tags';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router';

export function LessonDetail() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleSubmit = () => {
    setShowFeedback(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Link to="/learning/player" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Player IQ Track
      </Link>

      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="mb-2">Pick and Roll Reads - Ball Handler</h1>
            <p className="text-muted-foreground">
              Learn to read the defense and make the right decision as the ball handler
            </p>
          </div>
          <div className="flex gap-2">
            <Tag variant="player">Player IQ</Tag>
            <Tag variant="difficulty" difficulty="Intermediate">Intermediate</Tag>
          </div>
        </div>
      </div>

      <Card className="bg-muted/50">
        <div className="aspect-video bg-gradient-to-br from-[var(--player-blue)]/20 to-transparent rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-[var(--basketball-orange)] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-muted-foreground">Interactive Video Lesson</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="mb-2">Key Concepts</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--player-blue)] mt-0.5 flex-shrink-0" />
                <span>Identify the primary defender's positioning (going under vs. over the screen)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--player-blue)] mt-0.5 flex-shrink-0" />
                <span>Read the big's drop depth and help positioning</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-[var(--player-blue)] mt-0.5 flex-shrink-0" />
                <span>Make the decision before the screen is set</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4">Apply What You Learned</h3>
        <div className="aspect-video bg-muted/50 rounded-lg mb-4 flex items-center justify-center">
          <p className="text-muted-foreground">Court Diagram: Ball handler at top of key, screen being set</p>
        </div>

        <p className="mb-4">
          You're bringing the ball up the court. Your big man is about to set a screen at the top of the key.
          The defender is going under the screen, and the big's defender is in a deep drop. What's your read?
        </p>

        <div className="space-y-3 mb-6">
          <DecisionButton
            label="Take the pull-up jumper"
            description="Defender went under, take the open shot"
            selected={selectedAnswer === 0}
            onClick={() => setSelectedAnswer(0)}
          />
          <DecisionButton
            label="Attack downhill to the paint"
            description="Big is in drop, attack the gap"
            selected={selectedAnswer === 1}
            onClick={() => setSelectedAnswer(1)}
          />
          <DecisionButton
            label="Hit the screener rolling"
            description="Pass to the rolling big man"
            selected={selectedAnswer === 2}
            onClick={() => setSelectedAnswer(2)}
          />
          <DecisionButton
            label="Reject the screen"
            description="Change direction, attack the other way"
            selected={selectedAnswer === 3}
            onClick={() => setSelectedAnswer(3)}
          />
        </div>

        {!showFeedback ? (
          <Button
            onClick={handleSubmit}
            disabled={selectedAnswer === null}
            className="w-full"
          >
            Submit Answer
          </Button>
        ) : (
          <div className={`p-4 rounded-lg ${selectedAnswer === 0 ? 'bg-green-500/10 border-2 border-green-500/30' : 'bg-yellow-500/10 border-2 border-yellow-500/30'}`}>
            <h4 className={selectedAnswer === 0 ? 'text-green-500' : 'text-yellow-500'}>
              {selectedAnswer === 0 ? 'Correct!' : 'Not quite'}
            </h4>
            <p className="text-sm mt-2">
              {selectedAnswer === 0
                ? 'Perfect read! When the defender goes under the screen, you should take the open pull-up jumper. This punishes the defense for their decision and forces them to adjust their coverage.'
                : selectedAnswer === 1
                ? 'While attacking downhill can work, the defender going under means they can recover and contest your drive. The pull-up jumper is the more efficient play that forces the defense to adjust.'
                : selectedAnswer === 2
                ? 'The rolling big can be an option, but with the big in a deep drop, the pull-up is wide open. Take the shot and make the defense pay.'
                : 'Rejecting the screen is a counter move, but when the defense gives you an open shot, take it! The pull-up jumper is the correct read here.'
              }
            </p>
            <Link to="/learning/player/lesson/recap">
              <Button className="w-full mt-4">
                Continue to Lesson Summary
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
