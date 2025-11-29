#include <GL/glut.h>
#include <cstdlib>

// Transform state (Euler rotations, translation, uniform scale)
float rotateX = 20.0f;
float rotateY = -30.0f;
float rotateZ = 0.0f;
float translateX = 0.0f;
float translateY = 0.0f;
float translateZ = -20.0f;
float scaleFactor = 1.0f;

void drawLetterA() {
    glColor3f(0.8f, 0.1f, 0.1f);

    struct Vec2 {
        float x;
        float y;
    };

    auto interpolateY = [](const Vec2 &a, const Vec2 &b, float targetY) {
        float t = (targetY - a.y) / (b.y - a.y);
        return Vec2{a.x + t * (b.x - a.x), targetY};
    };

    const float halfDepth = 0.6f;

    const Vec2 apex{0.0f, 4.5f};
    const Vec2 leftBase{-3.0f, -4.5f};
    const Vec2 rightBase{3.0f, -4.5f};
    const float crossbarY = -0.2f;
    const Vec2 leftCross = interpolateY(apex, leftBase, crossbarY);
    const Vec2 rightCross = interpolateY(apex, rightBase, crossbarY);

    const Vec2 vertices[] = {apex, leftBase, rightBase, leftCross, rightCross};
    const int edges[][2] = {
        {0, 1},  // left leg
        {0, 2},  // right leg
        {3, 4},  // crossbar
    };

    glLineWidth(5.0f);

    glBegin(GL_LINES);
    for (const auto &edge : edges) {
        const Vec2 &a = vertices[edge[0]];
        const Vec2 &b = vertices[edge[1]];
        glVertex3f(a.x, a.y, halfDepth);
        glVertex3f(b.x, b.y, halfDepth);
        glVertex3f(a.x, a.y, -halfDepth);
        glVertex3f(b.x, b.y, -halfDepth);
    }
    glEnd();

    glBegin(GL_LINES);
    for (const auto &v : vertices) {
        glVertex3f(v.x, v.y, halfDepth);
        glVertex3f(v.x, v.y, -halfDepth);
    }
    glEnd();
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);
    glMatrixMode(GL_MODELVIEW);
    glLoadIdentity();

    glTranslatef(translateX, translateY, translateZ);
    glScalef(scaleFactor, scaleFactor, scaleFactor);
    glRotatef(rotateX, 1.0f, 0.0f, 0.0f);
    glRotatef(rotateY, 0.0f, 1.0f, 0.0f);
    glRotatef(rotateZ, 0.0f, 0.0f, 1.0f);

    drawLetterA();

    glutSwapBuffers();
}

void reshape(int width, int height) {
    const float aspect = (height == 0) ? 1.0f : static_cast<float>(width) / height;
    glViewport(0, 0, width, height);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluPerspective(60.0, aspect, 0.1, 100.0);
}

void keyboard(unsigned char key, int, int) {
    const float moveStep = 0.5f;
    const float rotateStep = 5.0f;
    const float scaleStep = 0.1f;

    switch (key) {
        case 'w': rotateX -= rotateStep; break;
        case 's': rotateX += rotateStep; break;
        case 'a': rotateY -= rotateStep; break;
        case 'd': rotateY += rotateStep; break;
        case 'q': rotateZ -= rotateStep; break;
        case 'e': rotateZ += rotateStep; break;
        case 'i': translateY += moveStep; break;
        case 'k': translateY -= moveStep; break;
        case 'j': translateX -= moveStep; break;
        case 'l': translateX += moveStep; break;
        case 'u': translateZ += moveStep; break;
        case 'o': translateZ -= moveStep; break;
        case '+':
        case '=': scaleFactor += scaleStep; break;
        case '-':
        case '_': scaleFactor = (scaleFactor - scaleStep > 0.1f) ? scaleFactor - scaleStep : 0.1f; break;
        case 27: std::exit(0); break;  // ESC
        default: return;
    }
    glutPostRedisplay();
}

void initGL() {
    glEnable(GL_DEPTH_TEST);
    glClearColor(0.1f, 0.1f, 0.15f, 1.0f);
}

int main(int argc, char **argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_DOUBLE | GLUT_RGB | GLUT_DEPTH);
    glutInitWindowSize(800, 600);
    glutCreateWindow("3D Letter A");

    initGL();

    glutDisplayFunc(display);
    glutReshapeFunc(reshape);
    glutKeyboardFunc(keyboard);

    glutMainLoop();
    return 0;
}
