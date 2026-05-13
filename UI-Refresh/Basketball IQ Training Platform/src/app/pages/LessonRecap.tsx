import { Card } from '../components/Cards';
import { Button } from '../components/Buttons';
import { StatsDisplay } from '../components/Progress';
import { CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router';

export function LessonRecap() {
  const results = [
    { question: 'Defender goes under the screen', correct: true, yourAnswer: 'Take the pull-up jumper', correctAnswer: 'Take the pull-up jumper' },
    { question: 'Big hedges hard on the screen', correct: false, yourAnswer: 'Attack downhill', correctAnswer: 'Pass to rolling big' },
    { question: 'Defender fights over the top', correct: true, yourAnswer: 'Use the screen and attack', correctAnswer: 'Use the screen and attack' },
    { question: 'Switch defense', correct: true, yourAnswer: 'Exploit mismatch', correctAnswer: 'Exploit mismatch' }
  ];

  const accuracy = (results.filter(r => r.correct).length / results.length) * 100;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="mb-2">Lesson Complete!</h1>
        <p className="text-muted-foreground">
          Great work on Pick and Roll Reads
        </p>
      </div>

      <Card>
        <h3 className="mb-4 text-center">Your Performance</h3>
        <StatsDisplay
          stats={[
            { label: 'Accuracy', value: `${accuracy}%`, color: 'var(--player-blue)' },
            { label: 'Questions', value: `${results.filter(r => r.correct).length}/${results.length}`, color: 'var(--gm-green)' },
            { label: 'Time', value: '8m 32s', color: 'var(--basketball-orange)' },
            { label: 'XP Earned', value: '+150', color: 'var(--coach-purple)' }
          ]}
        />
      </Card>

      <Card>
        <h3 className="mb-4">Question Breakdown</h3>
        <div className="space-y-4">
          {results.map((result, i) => (
            <div key={i} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
              {result.correct ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className="mb-1">{result.question}</p>
                <div className="text-sm space-y-1">
                  <p className={result.correct ? 'text-green-500' : 'text-red-500'}>
                    Your answer: {result.yourAnswer}
                  </p>
                  {!result.correct && (
                    <p className="text-muted-foreground">
                      Correct answer: {result.correctAnswer}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="bg-yellow-500/5 border-yellow-500/20">
        <h3 className="mb-2">Areas to Improve</h3>
        <p className="text-sm text-muted-foreground mb-4">
          You missed questions about hedge defense. Consider reviewing these concepts:
        </p>
        <div className="space-y-2">
          <Link to="/learning/player/lesson/hedge-reads" className="block">
            <div className="p-3 bg-card rounded-lg hover:bg-accent transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <span>Reading Hedge Defense</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          </Link>
        </div>
      </Card>

      <Card>
        <h3 className="mb-4">What's Next?</h3>
        <div className="space-y-3">
          <Link to="/learning/player/lesson/roller-reads">
            <div className="p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
              <h4 className="mb-1">Recommended: Pick & Roll - Roller's Perspective</h4>
              <p className="text-sm text-muted-foreground">
                Learn the screening big man's reads and timing
              </p>
            </div>
          </Link>

          <Link to="/daily-challenge">
            <div className="p-4 bg-gradient-to-r from-[var(--basketball-orange)]/10 to-transparent rounded-lg hover:opacity-80 transition-opacity cursor-pointer">
              <h4 className="mb-1">Try Today's Daily Challenge</h4>
              <p className="text-sm text-muted-foreground">
                Test your skills in a new scenario
              </p>
            </div>
          </Link>
        </div>
      </Card>

      <div className="flex gap-3">
        <Link to="/learning/player" className="flex-1">
          <Button variant="outline" className="w-full">
            Back to Player IQ Track
          </Button>
        </Link>
        <Link to="/learning/player/lesson/roller-reads" className="flex-1">
          <Button className="w-full">
            Next Lesson
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
