#include <iostream>

#include "Camera.h"
#include "VCTApplication.h"

#include "Object.h"

Object::Object() {
	material_ = NULL;
	position_ = glm::vec3(0.0f);
	scale_ = 1.0f;
}

Object::~Object() {
	delete mesh_;
}

void Object::setPosition(glm::vec3 pos) {
	position_ = pos;
}

void Object::setScale(float scale) {
	scale_ = scale;
}

void Object::draw(glm::mat4 &viewMatrix, glm::mat4 &projectionMatrix, glm::mat4 &depthViewProjectionMatrix, Texture2D depthTexture, Texture3D voxelTexture, GLuint shader) {
	glm::mat4 modelMatrix = glm::translate(glm::scale(glm::mat4(1.0f), glm::vec3(scale_)), position_);
	glm::mat4 modelViewMatrix = viewMatrix * modelMatrix;
	glm::mat4 depthModelViewProjectionMatrix = depthViewProjectionMatrix * modelMatrix;

	glUniformMatrix4fv(glGetUniformLocation(shader, "ViewMatrix"), 1, GL_FALSE, &viewMatrix[0][0]);
	glUniformMatrix4fv(glGetUniformLocation(shader, "ModelMatrix"), 1, GL_FALSE, &modelMatrix[0][0]);
	glUniformMatrix4fv(glGetUniformLocation(shader, "ModelViewMatrix"), 1, GL_FALSE, &modelViewMatrix[0][0]);
	glUniformMatrix4fv(glGetUniformLocation(shader, "ProjectionMatrix"), 1, GL_FALSE, &projectionMatrix[0][0]);
	glUniformMatrix4fv(glGetUniformLocation(shader, "DepthModelViewProjectionMatrix"), 1, GL_FALSE, &depthModelViewProjectionMatrix[0][0]);

	// Load material specific stuff
	// If there is no material textures will still be bound from previously drawn object.
	// All objects should probably have a material and glBindTexture(GL_TEXTURE_2D, 0)
	// if it doesnt have any textures.
	if(material_) {
		material_->bindMaterial(shader);
	}

	mesh_->draw();
}

// This is a bit stupid. Make drawing of objects more general somehow
void Object::drawSimple(glm::mat4 &viewProjectionMatrix, GLuint shader) {
	glm::mat4 modelMatrix = glm::translate(glm::scale(glm::mat4(1.0f), glm::vec3(scale_)), position_);
	glm::mat4 mvp = viewProjectionMatrix * modelMatrix;
	glUniformMatrix4fv(glGetUniformLocation(shader, "ModelViewProjectionMatrix"), 1, GL_FALSE, &mvp[0][0]);

	mesh_->draw();
}

void Object::drawTo3DTexture(GLuint shader, Texture3D voxelTexture, Texture2D depthTexture, float size, glm::mat4 &depthViewProjectionMatrix) {
    glUseProgram(shader);
    material_->bindMaterial(shader);
    
    // left, right, bottom, top, zNear, zFar
    glm::mat4 projectionMatrix = glm::ortho(-size*0.5f, size*0.5f, -size*0.5f, size*0.5f, size*0.5f, size*1.5f);
    glm::mat4 projX = projectionMatrix * glm::lookAt(glm::vec3(size, 0, 0), glm::vec3(0, 0, 0), glm::vec3(0, 1, 0));
    glm::mat4 projY = projectionMatrix * glm::lookAt(glm::vec3(0, size, 0), glm::vec3(0, 0, 0), glm::vec3(0, 0, -1));
    glm::mat4 projZ = projectionMatrix * glm::lookAt(glm::vec3(0, 0, size), glm::vec3(0, 0, 0), glm::vec3(0, 1, 0));
    
    glUniformMatrix4fv(glGetUniformLocation(shader, "projX"), 1, GL_FALSE, &projX[0][0]);
    glUniformMatrix4fv(glGetUniformLocation(shader, "projY"), 1, GL_FALSE, &projY[0][0]);
    glUniformMatrix4fv(glGetUniformLocation(shader, "projZ"), 1, GL_FALSE, &projZ[0][0]);

    // Matrix to transform to light position
    glm::mat4 modelMatrix = glm::translate(glm::scale(glm::mat4(1.0f), glm::vec3(scale_)), position_);
    glm::mat4 depthModelViewProjectionMatrix = depthViewProjectionMatrix * modelMatrix;

    glUniform1i(glGetUniformLocation(shader, "voxelDimensions"), voxelTexture.size);
    glUniformMatrix4fv(glGetUniformLocation(shader, "DepthModelViewProjectionMatrix"), 1, GL_FALSE, &depthModelViewProjectionMatrix[0][0]);
    glUniformMatrix4fv(glGetUniformLocation(shader, "ModelMatrix"), 1, GL_FALSE, &modelMatrix[0][0]);

    glActiveTexture(GL_TEXTURE0 + 1);
	glBindTexture(GL_TEXTURE_2D, depthTexture.textureID);
	glUniform1i(glGetUniformLocation(shader, "ShadowMap"), 1);

	// Bind single level of texture to image unit so we can write to it from shaders
    glBindTexture(GL_TEXTURE_3D, voxelTexture.textureID);
    glBindImageTexture(0, voxelTexture.textureID, 0, GL_TRUE, 0, GL_WRITE_ONLY, GL_RGBA8);
    glUniform1i(glGetUniformLocation(shader, "voxelTexture"), 0);
    
    mesh_->draw();
    //printf("Gen\n");
}