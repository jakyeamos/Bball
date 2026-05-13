import { Card } from '../components/Cards';
import { StatsDisplay } from '../components/Progress';
import { Link } from 'react-router';
import { BookOpen, Users, Trophy, TrendingUp } from 'lucide-react';

export function AdminDashboard() {
  return (
    <div className="max-w-screen-xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="mb-1">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage content and platform settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <BookOpen className="w-8 h-8 text-[var(--player-blue)] mb-2" />
          <div className="text-2xl mb-1">142</div>
          <div className="text-sm text-muted-foreground">Total Lessons</div>
        </Card>

        <Card>
          <Trophy className="w-8 h-8 text-[var(--basketball-orange)] mb-2" />
          <div className="text-2xl mb-1">30</div>
          <div className="text-sm text-muted-foreground">Daily Challenges</div>
        </Card>

        <Card>
          <Users className="w-8 h-8 text-[var(--gm-green)] mb-2" />
          <div className="text-2xl mb-1">1,247</div>
          <div className="text-sm text-muted-foreground">Active Users</div>
        </Card>

        <Card>
          <TrendingUp className="w-8 h-8 text-[var(--coach-purple)] mb-2" />
          <div className="text-2xl mb-1">94%</div>
          <div className="text-sm text-muted-foreground">Completion Rate</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/lessons">
          <Card className="cursor-pointer hover:scale-[1.02] text-center">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-[var(--player-blue)]" />
            <h3 className="mb-2">Manage Lessons</h3>
            <p className="text-sm text-muted-foreground">
              Create and edit learning content
            </p>
          </Card>
        </Link>

        <Link to="/admin/challenges">
          <Card className="cursor-pointer hover:scale-[1.02] text-center">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-[var(--basketball-orange)]" />
            <h3 className="mb-2">Daily Challenges</h3>
            <p className="text-sm text-muted-foreground">
              Schedule and manage challenges
            </p>
          </Card>
        </Link>

        <Link to="/admin/tags">
          <Card className="cursor-pointer hover:scale-[1.02] text-center">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 text-[var(--gm-green)]" />
            <h3 className="mb-2">Tags & Categories</h3>
            <p className="text-sm text-muted-foreground">
              Manage content taxonomy
            </p>
          </Card>
        </Link>
      </div>

      <Card>
        <h2 className="mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { action: 'New lesson created', item: 'Pick & Roll Coverage', time: '2 hours ago' },
            { action: 'Challenge published', item: '3rd Quarter Adjustments', time: '5 hours ago' },
            { action: 'Lesson updated', item: 'Draft Strategy 101', time: '1 day ago' },
          ].map((activity, i) => (
            <div key={i} className="flex items-center justify-between pb-3 border-b border-border last:border-0">
              <div>
                <div className="mb-1">{activity.action}</div>
                <div className="text-sm text-muted-foreground">{activity.item}</div>
              </div>
              <div className="text-sm text-muted-foreground">{activity.time}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
