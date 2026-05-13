import { useState } from 'react';
import { Card, ChallengeCard } from '../components/Cards';
import { Button, DecisionButton } from '../components/Buttons';
import { Trophy, Share2, TrendingUp } from 'lucide-react';

export function DailyChallenge() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Daily Challenge</h1>
          <p className="text-muted-foreground">April 30, 2026</p>
        </div>
        <div className="flex items-center gap-2 text-[var(--basketball-orange)]">
          <TrendingUp className="w-5 h-5" />
          <span>5 day streak</span>
        </div>
      </div>

      {!submitted ? (
        <>
          <Card>
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-6 h-6 text-[var(--basketball-orange)]" />
              <div>
                <h2>3rd Quarter Adjustments</h2>
                <p className="text-sm text-muted-foreground">Coach IQ Challenge</p>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg mb-4">
              <h3 className="text-sm mb-2">Scenario</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your team is down 12 points at halftime. The opposing team has been dominant in the paint,
                scoring 32 points inside. Your starting center has 3 fouls. They're running a lot of
                pick-and-roll with their All-Star guard and their athletic big man. Your perimeter defense
                has been solid, but the paint protection has been lacking.
              </p>
            </div>

            <div className="mb-4">
              <h3 className="text-sm mb-3">What adjustment do you make?</h3>
              <div className="space-y-3">
                <DecisionButton
                  label="Go to zone defense (2-3 zone)"
                  description="Pack the paint, force outside shots"
                  selected={selectedAnswer === 0}
                  onClick={() => setSelectedAnswer(0)}
                />
                <DecisionButton
                  label="Switch everything on pick-and-rolls"
                  description="Eliminate the big's rolling opportunities"
                  selected={selectedAnswer === 1}
                  onClick={() => setSelectedAnswer(1)}
                />
                <DecisionButton
                  label="Bring in backup center, play bigger"
                  description="Match their size with a fresh big"
                  selected={selectedAnswer === 2}
                  onClick={() => setSelectedAnswer(2)}
                />
                <DecisionButton
                  label="Trap the pick-and-roll, force others to beat you"
                  description="Take the ball out of their best player's hands"
                  selected={selectedAnswer === 3}
                  onClick={() => setSelectedAnswer(3)}
                />
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={selectedAnswer === null}
              className="w-full"
            >
              Submit Answer
            </Button>
          </Card>
        </>
      ) : (
        <>
          <Card className="bg-gradient-to-r from-green-500/10 to-transparent border-green-500/30">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-6 h-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h2 className="text-green-500 mb-1">Challenge Complete!</h2>
                <p className="text-sm text-muted-foreground">
                  {selectedAnswer === 1
                    ? 'Great decision! Switching eliminates the rolling big advantage.'
                    : 'Good thinking, but switching might be the more effective adjustment here.'}
                </p>
              </div>
            </div>

            <div className="p-4 bg-card rounded-lg mb-4">
              <h3 className="text-sm mb-2">Expert Analysis</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Switching everything on pick-and-rolls is the best adjustment here. It eliminates the athletic
                big's rolling opportunities and forces their guard to beat you one-on-one. While zone defense
                could help, skilled pick-and-roll teams can exploit zone weaknesses. The key is removing their
                best action without creating new mismatches.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-card rounded-lg">
                <div className="text-2xl text-[var(--basketball-orange)] mb-1">+50</div>
                <div className="text-xs text-muted-foreground">XP Earned</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg">
                <div className="text-2xl text-[var(--coach-purple)] mb-1">5</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </div>
              <div className="text-center p-3 bg-card rounded-lg">
                <div className="text-2xl text-[var(--gm-green)] mb-1">87%</div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <Share2 className="w-4 h-4" />
              Share Result
            </Button>
          </Card>

          <div>
            <h3 className="mb-4">Related Lessons</h3>
            <div className="grid grid-cols-1 gap-3">
              <Card className="cursor-pointer hover:scale-[1.01] transition-transform">
                <h4 className="mb-1">Defensive Adjustments 101</h4>
                <p className="text-sm text-muted-foreground">Learn when and how to make in-game defensive changes</p>
              </Card>
              <Card className="cursor-pointer hover:scale-[1.01] transition-transform">
                <h4 className="mb-1">Pick & Roll Coverage Schemes</h4>
                <p className="text-sm text-muted-foreground">Master different ways to defend the pick-and-roll</p>
              </Card>
            </div>
          </div>
        </>
      )}

      <div>
        <h3 className="mb-4">Recent Challenges</h3>
        <div className="space-y-3">
          <ChallengeCard
            title="Draft Day Trade Decision"
            description="Should you trade up for a star prospect?"
            status="completed"
          />
          <ChallengeCard
            title="Crunch Time Play Call"
            description="Your team is down 2 with 15 seconds left. What play?"
            status="completed"
          />
          <ChallengeCard
            title="Rotation Management"
            description="Your star player has 4 fouls in the 3rd quarter"
            status="completed"
          />
        </div>
      </div>
    </div>
  );
}
