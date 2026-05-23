import json
import random
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth.models import User
from reviewer.models import Review
from explainer.models import Project


REVIEW_TEMPLATES = [
    {
        'name': 'Authentication middleware validation fix',
        'language': 'typescript',
        'issues': [
            {'type': 'bug', 'severity': 'critical', 'line': 12, 'message': 'JWT token not validated before route access, allowing unauthenticated bypass.', 'fix': 'if (!token || !verifyJWT(token)) throw new UnauthorizedError();'},
            {'type': 'bug', 'severity': 'major', 'line': 28, 'message': 'Session expiry check missing — stale sessions persist indefinitely.', 'fix': 'if (session.expiresAt < Date.now()) return res.status(401).json({error: "Session expired"});'},
            {'type': 'suggestion', 'severity': 'minor', 'line': 45, 'message': 'Consider using helmet middleware for HTTP security headers.', 'fix': None},
        ],
    },
    {
        'name': 'Database pool connection leak patch',
        'language': 'go',
        'issues': [
            {'type': 'bug', 'severity': 'critical', 'line': 45, 'message': 'Connections created are not defer-closed, causing pool exhaustion under load.', 'fix': 'defer conn.Close()'},
        ],
    },
    {
        'name': 'CSS mobile layout styling fix',
        'language': 'css',
        'issues': [],
    },
    {
        'name': 'React state management refactor',
        'language': 'typescript',
        'issues': [
            {'type': 'suggestion', 'severity': 'major', 'line': 15, 'message': 'useState called inside conditional block — violates Rules of Hooks.', 'fix': 'Move useState to the top level of the component.'},
            {'type': 'style', 'severity': 'minor', 'line': 32, 'message': 'Component exceeds 300 lines. Consider splitting into sub-components.', 'fix': None},
        ],
    },
    {
        'name': 'REST API input sanitization',
        'language': 'python',
        'issues': [
            {'type': 'bug', 'severity': 'critical', 'line': 8, 'message': 'User input passed directly to SQL query — SQL injection vulnerability.', 'fix': 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", [user_id])'},
            {'type': 'suggestion', 'severity': 'major', 'line': 22, 'message': 'Missing rate limiting on authentication endpoint.', 'fix': None},
        ],
    },
    {
        'name': 'WebSocket reconnection handler',
        'language': 'javascript',
        'issues': [
            {'type': 'bug', 'severity': 'major', 'line': 18, 'message': 'Missing exponential backoff on reconnection — rapid retry can overwhelm server.', 'fix': 'const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);'},
        ],
    },
    {
        'name': 'Docker compose networking config',
        'language': 'go',
        'issues': [
            {'type': 'suggestion', 'severity': 'minor', 'line': 5, 'message': 'Hardcoded port numbers — use environment variables for portability.', 'fix': None},
        ],
    },
    {
        'name': 'GraphQL resolver N+1 optimization',
        'language': 'typescript',
        'issues': [
            {'type': 'bug', 'severity': 'major', 'line': 34, 'message': 'Each resolver triggers a separate DB query — use DataLoader to batch.', 'fix': 'const userLoader = new DataLoader(keys => batchGetUsers(keys));'},
            {'type': 'style', 'severity': 'minor', 'line': 52, 'message': 'Resolver function naming inconsistent with schema types.', 'fix': None},
        ],
    },
    {
        'name': 'Redis cache TTL misconfiguration',
        'language': 'python',
        'issues': [
            {'type': 'bug', 'severity': 'critical', 'line': 19, 'message': 'Cache TTL set to 0 effectively disables caching. Set appropriate expiry.', 'fix': 'cache.set(key, value, timeout=3600)  # 1 hour TTL'},
        ],
    },
    {
        'name': 'Kubernetes deployment spec review',
        'language': 'go',
        'issues': [
            {'type': 'suggestion', 'severity': 'major', 'line': 10, 'message': 'No resource limits defined — pod can consume unbounded memory.', 'fix': None},
            {'type': 'suggestion', 'severity': 'minor', 'line': 25, 'message': 'Consider adding readiness and liveness probes.', 'fix': None},
        ],
    },
    {
        'name': 'Payment gateway integration',
        'language': 'typescript',
        'issues': [
            {'type': 'bug', 'severity': 'critical', 'line': 78, 'message': 'Payment amount not validated server-side — client can send arbitrary values.', 'fix': 'const amount = validateAndParseAmount(req.body.amount);'},
            {'type': 'bug', 'severity': 'major', 'line': 92, 'message': 'Webhook signature not verified — vulnerable to forged callbacks.', 'fix': 'const isValid = stripe.webhooks.constructEvent(body, sig, secret);'},
        ],
    },
    {
        'name': 'Logging pipeline structured output',
        'language': 'python',
        'issues': [
            {'type': 'style', 'severity': 'minor', 'line': 14, 'message': 'Using print() for logging — replace with structured logger.', 'fix': 'logger.info("Processing request", extra={"request_id": req_id})'},
        ],
    },
    {
        'name': 'Next.js SSR data fetching audit',
        'language': 'typescript',
        'issues': [
            {'type': 'suggestion', 'severity': 'major', 'line': 8, 'message': 'getServerSideProps fetches data on every request — consider ISR for semi-static pages.', 'fix': None},
        ],
    },
    {
        'name': 'CI pipeline YAML validation',
        'language': 'html',
        'issues': [
            {'type': 'suggestion', 'severity': 'minor', 'line': 30, 'message': 'Duplicate step names in pipeline stages — rename for clarity.', 'fix': None},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed realistic demo data for the dashboard (reviews, projects)'

    def handle(self, *args, **options):
        # Get or create a demo user
        user, created = User.objects.get_or_create(
            username='demo@aireviewer.dev',
            defaults={
                'email': 'demo@aireviewer.dev',
                'is_active': True,
            }
        )
        if created:
            user.set_password('demo1234')
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Created demo user: {user.email}'))

        # Clear old demo reviews for this user
        Review.objects.filter(user=user).delete()

        now = timezone.now()

        for idx, template in enumerate(REVIEW_TEMPLATES):
            hours_ago = random.randint(1, 720)  # spread over ~30 days
            created_at = now - timedelta(hours=hours_ago)
            has_issues = len(template['issues']) > 0

            review = Review(
                user=user,
                name=template['name'],
                language=template['language'],
                status='complete',
                storage_path=f'demo/review_{idx + 1}.txt',
                result=template['issues'] if has_issues else [],
            )
            review.save()

            # Override created_at after save (auto_now_add)
            Review.objects.filter(id=review.id).update(created_at=created_at)

        self.stdout.write(self.style.SUCCESS(
            f'Seeded {len(REVIEW_TEMPLATES)} reviews for user {user.email}'
        ))

        # Seed projects
        project_names = [
            'Procurement Client Portal',
            'Auth Gateway Microservice',
        ]

        for pname in project_names:
            proj, _ = Project.objects.get_or_create(
                user=user,
                name=pname,
            )
            self.stdout.write(self.style.SUCCESS(f'  Project: {proj.name} (id={proj.id})'))

        self.stdout.write(self.style.SUCCESS('\n✅ Demo data seeded successfully!'))
